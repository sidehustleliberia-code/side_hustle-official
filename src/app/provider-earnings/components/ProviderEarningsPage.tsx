'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowLeft, Clock, CheckCircle, ChevronRight, TrendingUp, Lock, ArrowDownCircle, Briefcase, Loader2, Calendar, Filter, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { providerService } from '@/lib/services/dataService';
import type { AppEarning, AppDisbursement, AppProviderProfile } from '@/lib/types/database';

type TabKey = 'completed' | 'overview' | 'history' | 'pending';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function ProviderEarningsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('completed');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<AppEarning[]>([]);
  const [disbursements, setDisbursements] = useState<AppDisbursement[]>([]);
  const [providerProfile, setProviderProfile] = useState<AppProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  // Date range filter state
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // first of current month
    return toInputDate(d);
  });
  const [dateTo, setDateTo] = useState<string>(() => toInputDate(new Date()));

  useEffect(() => {
    if (!user) return;
    Promise.all([
      providerService.getEarnings(user.id),
      providerService.getDisbursements(user.id),
      providerService.getProfile(user.id),
    ]).then(([e, d, p]) => {
      setEarnings(e);
      setDisbursements(d);
      setProviderProfile(p);
      setLoading(false);
    });
  }, [user]);

  const paidEarnings = earnings.filter((e) => !e.isInEscrow);
  const pendingEarnings = earnings.filter((e) => e.isInEscrow);

  const pendingWithdrawalTotal = disbursements
    .filter((d) => ['pending', 'under_review', 'approved', 'processing'].includes(d.disbursementStatus))
    .reduce((sum, d) => sum + d.amount, 0);
  const currentBalance = Math.max((providerProfile?.currentBalance || 0) - pendingWithdrawalTotal, 0);
  const escrowBalance = providerProfile?.escrowBalance || 0;
  const totalEarned = providerProfile?.totalEarned || 0;
  const thisMonthEarned = earnings
    .filter((e) => {
      const d = new Date(e.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + e.netAmount, 0);

  // Completed jobs filtered by date range
  const filteredCompletedJobs = useMemo(() => {
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T23:59:59');
    return paidEarnings.filter((e) => {
      const d = new Date(e.createdAt);
      return d >= from && d <= to;
    });
  }, [paidEarnings, dateFrom, dateTo]);

  const cumulativeEarnings = filteredCompletedJobs.reduce((s, e) => s + e.netAmount, 0);
  const cumulativeGross = filteredCompletedJobs.reduce((s, e) => s + e.grossAmount, 0);
  const cumulativeFees = filteredCompletedJobs.reduce((s, e) => s + e.platformFee, 0);

  // Payment status breakdown for completed jobs in range
  const paidCount = filteredCompletedJobs.length;
  const escrowCount = pendingEarnings.filter((e) => {
    const d = new Date(e.createdAt);
    const from = new Date(dateFrom + 'T00:00:00');
    const to = new Date(dateTo + 'T23:59:59');
    return d >= from && d <= to;
  }).length;

  const statusConfig = {
    paid: { label: 'Paid', className: 'bg-success/10 text-success' },
    pending: { label: 'In Escrow', className: 'bg-warning/10 text-warning' },
    processing: { label: 'Processing', className: 'bg-primary/10 text-primary' },
  };

  const handleRequestDisbursement = async () => {
    if (!user || !providerProfile || currentBalance <= 0) {
      toast.error('No available balance to disburse.');
      return;
    }
    setRequesting(true);
    try {
      const success = await providerService.requestDisbursement({
        providerId: user.id,
        amount: currentBalance,
        channel: providerProfile.payoutProvider || 'orange_money',
        mobileNumber: providerProfile.payoutMobile || '',
      });
      if (success) {
        toast.success('Test-mode withdrawal request submitted. It will move through pending → review → processing before completion.');
        const updated = await providerService.getDisbursements(user.id);
        setDisbursements(updated);
      } else {
        toast.error('Could not submit disbursement request. Check your available balance and payout details.');
      }
    } catch {
      toast.error('Failed to request disbursement.');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/provider-dashboard" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back to dashboard">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <div className="h-5 w-px bg-border" />
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={26} />
              <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
            </Link>
          </div>
          <h1 className="text-sm font-bold text-foreground">Earnings & Payouts</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 flex flex-col gap-5">
        {/* Balance Hero */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-7">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-4xl font-extrabold text-white tabular-nums mb-1">LRD {currentBalance.toLocaleString()}</p>
          <p className="text-white/60 text-xs mb-5">Ready for disbursement · {pendingWithdrawalTotal > 0 ? `LRD ${pendingWithdrawalTotal.toLocaleString()} pending review` : 'No pending withdrawals'}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl px-3 py-3 text-center">
              <p className="text-xs text-white/60 mb-1">In Escrow</p>
              <p className="text-base font-extrabold text-secondary tabular-nums">LRD {escrowBalance.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl px-3 py-3 text-center">
              <p className="text-xs text-white/60 mb-1">Pending</p>
              <p className="text-base font-extrabold text-white tabular-nums">LRD {pendingWithdrawalTotal.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl px-3 py-3 text-center">
              <p className="text-xs text-white/60 mb-1">All Time</p>
              <p className="text-base font-extrabold text-white tabular-nums">LRD {totalEarned.toLocaleString()}</p>
            </div>
          </div>
          <button
            onClick={handleRequestDisbursement}
            disabled={requesting || currentBalance <= 0}
            className="btn-secondary w-full mt-5 py-3 text-sm font-bold"
          >
            {requesting ? <><Loader2 size={16} className="animate-spin" /> Requesting...</> : <><ArrowDownCircle size={17} /> Request Disbursement</>}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Jobs Completed', value: String(providerProfile?.totalJobs || 0), icon: Briefcase, color: 'text-primary', bg: 'bg-navy-50' },
            { label: 'Avg. Per Job', value: providerProfile?.totalJobs ? `LRD ${Math.round(totalEarned / providerProfile.totalJobs).toLocaleString()}` : 'LRD 0', icon: TrendingUp, color: 'text-success', bg: 'bg-green-50' },
            { label: 'Pending Payouts', value: String(pendingEarnings.length), icon: Clock, color: 'text-warning', bg: 'bg-amber-50' },
            { label: 'Disbursements', value: String(disbursements.length), icon: CheckCircle, color: 'text-primary', bg: 'bg-navy-50' },
          ].map((stat) => (
            <div key={`stat-${stat.label}`} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {([
              { key: 'completed' as TabKey, label: 'Completed Jobs' },
              { key: 'overview' as TabKey, label: 'Per-Job Breakdown' },
              { key: 'pending' as TabKey, label: 'In Escrow' },
              { key: 'history' as TabKey, label: 'Disbursements' },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex-1 py-3.5 text-xs font-bold transition-colors whitespace-nowrap px-2 ${activeTab === tab.key ? 'text-primary border-b-2 border-primary bg-navy-50/50' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Completed Jobs Breakdown with Date Range Filter */}
          {activeTab === 'completed' && (
            <div>
              {/* Date Range Filter */}
              <div className="px-5 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={14} className="text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">Date Range Filter</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">From</label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">To</label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cumulative Summary */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">Cumulative Earnings</span>
                  <span className="text-xs text-muted-foreground ml-auto">{filteredCompletedJobs.length} job{filteredCompletedJobs.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gross</p>
                    <p className="text-sm font-extrabold text-foreground tabular-nums">LRD {cumulativeGross.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Platform Fee</p>
                    <p className="text-sm font-extrabold text-danger tabular-nums">- LRD {cumulativeFees.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Net Earned</p>
                    <p className="text-sm font-extrabold text-success tabular-nums">LRD {cumulativeEarnings.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment Status Breakdown */}
                <div className="mt-3 flex gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                    <CheckCircle size={14} className="text-success flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-success">{paidCount} Paid</p>
                      <p className="text-xs text-muted-foreground">Released</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">
                    <Clock size={14} className="text-warning flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-warning">{escrowCount} Escrow</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job List */}
              <div className="divide-y divide-border">
                {filteredCompletedJobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <BarChart3 size={28} className="text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground mb-1">No completed jobs</p>
                    <p className="text-xs text-muted-foreground">No paid jobs found in the selected date range.</p>
                  </div>
                ) : (
                  filteredCompletedJobs.map((earning) => (
                    <div key={earning.id}>
                      <button
                        onClick={() => setExpandedTxn(expandedTxn === earning.id ? null : earning.id)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{earning.job?.serviceLabel || 'Service'}</p>
                          <p className="text-xs text-muted-foreground">{earning.job?.ref || ''} · {formatDate(earning.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 mr-1">
                          <p className="text-sm font-extrabold text-success">LRD {earning.netAmount.toLocaleString()}</p>
                          <span className="text-xs font-semibold bg-success/10 text-success px-2 py-0.5 rounded-full">Paid</span>
                        </div>
                        <ChevronRight size={16} className={`text-muted-foreground transition-transform flex-shrink-0 ${expandedTxn === earning.id ? 'rotate-90' : ''}`} />
                      </button>
                      {expandedTxn === earning.id && (
                        <div className="px-5 pb-4 bg-muted/20 flex flex-col gap-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Job Value</span>
                            <span className="font-semibold">LRD {earning.grossAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Platform Fee</span>
                            <span className="font-semibold text-danger">- LRD {earning.platformFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold border-t border-border pt-2">
                            <span>Your Payout</span>
                            <span className="text-success">LRD {earning.netAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-muted-foreground">Payment Status</span>
                            <span className="font-semibold text-success flex items-center gap-1">
                              <CheckCircle size={11} /> Released
                            </span>
                          </div>
                          {earning.releasedAt && (
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Released On</span>
                              <span className="font-semibold">{formatDate(earning.releasedAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Per-Job Breakdown */}
          {activeTab === 'overview' && (
            <div className="divide-y divide-border">
              {paidEarnings.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No completed earnings yet.</p>
                </div>
              ) : (
                paidEarnings.map((earning) => (
                  <div key={earning.id}>
                    <button onClick={() => setExpandedTxn(expandedTxn === earning.id ? null : earning.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{earning.job?.serviceLabel || 'Service'}</p>
                        <p className="text-xs text-muted-foreground">{earning.job?.ref || ''} · {new Date(earning.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-success">LRD {earning.netAmount.toLocaleString()}</p>
                        <span className="text-xs font-semibold bg-success/10 text-success px-2 py-0.5 rounded-full">Paid</span>
                      </div>
                      <ChevronRight size={16} className={`text-muted-foreground transition-transform ${expandedTxn === earning.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedTxn === earning.id && (
                      <div className="px-5 pb-4 bg-muted/20 flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Job Value</span>
                          <span className="font-semibold">LRD {earning.grossAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Platform Fee</span>
                          <span className="font-semibold text-danger">- LRD {earning.platformFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t border-border pt-2">
                          <span>Your Payout</span>
                          <span className="text-success">LRD {earning.netAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* In Escrow */}
          {activeTab === 'pending' && (
            <div className="divide-y divide-border">
              {pendingEarnings.length === 0 ? (
                <div className="p-8 text-center">
                  <Lock size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No funds currently held in escrow.</p>
                </div>
              ) : (
                pendingEarnings.map((earning) => (
                  <div key={earning.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{earning.job?.serviceLabel || 'Service'}</p>
                      <p className="text-xs text-muted-foreground">{earning.job?.ref || ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-warning">LRD {earning.netAmount.toLocaleString()}</p>
                      <span className="text-xs font-semibold bg-warning/10 text-warning px-2 py-0.5 rounded-full">In Escrow</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Disbursements */}
          {activeTab === 'history' && (
            <div className="divide-y divide-border">
              {disbursements.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No disbursements yet.</p>
                </div>
              ) : (
                disbursements.map((dis) => (
                  <div key={dis.id} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">LRD {dis.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {dis.channel === 'orange_money' ? '🟠 Orange Money' : '🟡 MTN MoMo'} · {dis.ref}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(dis.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                      dis.disbursementStatus === 'completed' ? 'bg-success/10 text-success'
                        : dis.disbursementStatus === 'processing'? 'bg-primary/10 text-primary' :'bg-warning/10 text-warning'
                    }`}>
                      {dis.disbursementStatus.charAt(0).toUpperCase() + dis.disbursementStatus.slice(1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
