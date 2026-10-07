'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, DollarSign, Users, TrendingUp, CheckCircle, Clock, AlertCircle, Activity, RefreshCw, Loader2, AlertTriangle, Shield, LogIn, ArrowUpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { adminService } from '@/lib/services/dataService';
import Link from 'next/link';

interface KPIs {
  totalJobsToday: number;
  activeProviders: number;
  openDisputes: number;
  pendingPayments: number;
  completedJobsToday: number;
  totalCustomers: number;
  totalProviders: number;
}

interface FinancialSummary {
  grossTransactionValue: number;
  platformRevenue: number;
  providerShare: number;
  pendingHeld: number;
  disbursed: number;
}

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState<KPIs>({
    totalJobsToday: 0,
    activeProviders: 0,
    openDisputes: 0,
    pendingPayments: 0,
    completedJobsToday: 0,
    totalCustomers: 0,
    totalProviders: 0,
  });
  const [financial, setFinancial] = useState<FinancialSummary>({
    grossTransactionValue: 0,
    platformRevenue: 0,
    providerShare: 0,
    pendingHeld: 0,
    disbursed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'not_logged_in' | 'not_admin' | 'ok'>('checking');
  const [error, setError] = useState<string | null>(null);

  // Step 1: Verify admin auth directly — no context dependency
  const checkAdminAuth = async (): Promise<{ userId: string } | null> => {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      setAuthState('not_logged_in');
      setLoading(false);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, full_name, account_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      const metaRole = user.user_metadata?.role || user.app_metadata?.role;
      if (metaRole !== 'admin') {
        setAuthState('not_admin');
        setLoading(false);
        return null;
      }
    } else {
      const role = profile?.role || user.user_metadata?.role || user.app_metadata?.role;
      if (role !== 'admin') {
        setAuthState('not_admin');
        setLoading(false);
        return null;
      }
    }

    setAuthState('ok');
    return { userId: user.id };
  };

  // Step 2: Load KPIs and financial summary
  const loadKPIs = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);

    try {
      setError(null);

      const [
        jobsTodayRes,
        providersRes,
        disputesRes,
        pendingRes,
        completedTodayRes,
        customersRes,
        totalProvidersRes,
        financialSummary,
      ] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
        supabase.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('provider_status', 'active'),
        supabase.from('disputes').select('*', { count: 'exact', head: true }).in('dispute_status', ['open', 'under_review']),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('job_status', 'completed').gte('completed_at', `${today}T00:00:00`),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'provider'),
        adminService.getFinancialSummary(),
      ]);

      const errors = [jobsTodayRes, providersRes, disputesRes, pendingRes, completedTodayRes, customersRes, totalProvidersRes]
        .filter(r => r.error)
        .map(r => r.error?.message);

      if (errors.length > 0) {
        console.error('Admin KPI query errors:', errors);
        setError(`Some queries failed: ${errors[0]}. Check RLS policies for admin role.`);
      }

      setKpis({
        totalJobsToday: jobsTodayRes.count || 0,
        activeProviders: providersRes.count || 0,
        openDisputes: disputesRes.count || 0,
        pendingPayments: pendingRes.count || 0,
        completedJobsToday: completedTodayRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalProviders: totalProvidersRes.count || 0,
      });

      setFinancial(financialSummary);
    } catch (err: any) {
      console.error('Admin KPI load error:', err);
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkAdminAuth().then((result) => {
      if (result) {
        loadKPIs();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authState !== 'ok') return;
    const supabase = createClient();
    const channel = supabase
      .channel('admin-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { loadKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => { loadKPIs(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => { loadKPIs(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authState, loadKPIs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadKPIs();
  };

  if (authState === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (authState === 'not_logged_in') {
    return (
      <div className="p-5 lg:p-8 max-w-screen-xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <LogIn size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Authentication Required</h2>
          <p className="text-sm text-muted-foreground mb-6">Please log in with your admin account to access the dashboard.</p>
          <Link href="/unified-authentication-portal" className="btn-primary px-6 py-3 inline-block">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (authState === 'not_admin') {
    return (
      <div className="p-5 lg:p-8 max-w-screen-xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-danger" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-3">Your account does not have admin privileges.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="text-xs font-bold text-amber-800 mb-1">To fix this:</p>
            <p className="text-xs text-amber-700">In Supabase → Table Editor → <code>user_profiles</code> → find your account row → set <code>role</code> to <code>admin</code>.</p>
          </div>
          <Link href="/" className="btn-primary px-6 py-3 inline-block">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const operationalCards = [
    { label: 'Total Jobs Today', value: String(kpis.totalJobsToday), icon: Briefcase, color: 'text-primary', bg: 'bg-navy-50' },
    { label: 'Active Providers', value: String(kpis.activeProviders), icon: Users, color: 'text-primary', bg: 'bg-navy-50' },
    { label: 'Open Disputes', value: String(kpis.openDisputes), icon: AlertCircle, color: 'text-danger', bg: 'bg-red-50' },
    { label: 'Pending Payments', value: String(kpis.pendingPayments), icon: Clock, color: 'text-warning', bg: 'bg-amber-50' },
    { label: 'Completed Today', value: String(kpis.completedJobsToday), icon: CheckCircle, color: 'text-success', bg: 'bg-green-50' },
    { label: 'Total Customers', value: String(kpis.totalCustomers), icon: Users, color: 'text-primary', bg: 'bg-navy-50' },
    { label: 'Total Providers', value: String(kpis.totalProviders), icon: TrendingUp, color: 'text-primary', bg: 'bg-navy-50' },
  ];

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Operational Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live platform metrics</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Error banner */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
              <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Partial data — some queries failed</p>
                <p className="text-xs text-amber-700 mt-0.5">{error}</p>
                <p className="text-xs text-amber-600 mt-1">
                  Ensure your <code>user_profiles.role</code> is set to <code>admin</code> and RLS policies allow admin reads.
                </p>
              </div>
            </div>
          )}

          {/* Financial Breakdown — primary section */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign size={16} className="text-success" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Financial Breakdown</h2>
              <span className="text-xs text-muted-foreground ml-1">(from confirmed payments only)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {/* Gross Transaction Value */}
              <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                    <DollarSign size={18} className="text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gross Transaction Value</p>
                </div>
                <p className="text-2xl font-extrabold text-foreground tabular-nums">
                  LRD {financial.grossTransactionValue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total amount customers have paid (100%)</p>
              </div>

              {/* Side Hustle Platform Revenue (15%) */}
              <div className="bg-card rounded-2xl border border-green-200 p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <TrendingUp size={18} className="text-success" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Side Hustle Revenue</p>
                </div>
                <p className="text-2xl font-extrabold text-success tabular-nums">
                  LRD {financial.platformRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Platform commission — 15% of gross</p>
              </div>

              {/* Provider Share (85%) */}
              <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                    <ArrowUpCircle size={18} className="text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider Share</p>
                </div>
                <p className="text-2xl font-extrabold text-primary tabular-nums">
                  LRD {financial.providerShare.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Provider earnings — 85% of gross</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pending / Held */}
              <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} className="text-warning" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-foreground tabular-nums">
                    LRD {financial.pendingHeld.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending / Held — awaiting confirmation</p>
                </div>
              </div>

              {/* Disbursed to Providers */}
              <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-success" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-foreground tabular-nums">
                    LRD {financial.disbursed.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Disbursed — released to providers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational KPI Cards */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-navy-50 flex items-center justify-center">
                <Activity size={16} className="text-primary" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Operational Metrics</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {operationalCards.map((card) => (
                <div key={`kpi-${card.label}`} className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground tabular-nums">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Summary */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                <Activity size={18} className="text-primary" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Platform Summary</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-primary">{kpis.totalCustomers + kpis.totalProviders}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Users</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-success">LRD {financial.platformRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Side Hustle Revenue (15%)</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-warning">{kpis.pendingPayments}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending Actions</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-danger">{kpis.openDisputes}</p>
                <p className="text-xs text-muted-foreground mt-1">Open Disputes</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
