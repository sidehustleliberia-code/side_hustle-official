'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import NotificationBell from '@/components/ui/NotificationBell';
import { User, MapPin, Clock, DollarSign, CheckCircle, Package, ChevronRight, Loader2, Plus, Star, RefreshCw, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { customerService } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import type { AppJob, AppPayment, JobStatus } from '@/lib/types/database';

/** Map job status to a human-readable label and color */
function getStatusDisplay(status: JobStatus): { label: string; color: string; bg: string } {
  const map: Record<JobStatus, { label: string; color: string; bg: string }> = {
    requested: { label: 'Requested', color: 'text-muted-foreground', bg: 'bg-muted' },
    payment_confirmed: { label: 'Payment Confirmed', color: 'text-warning', bg: 'bg-amber-50' },
    ready_for_assignment: { label: 'Finding Provider', color: 'text-primary', bg: 'bg-navy-50' },
    assigned: { label: 'Provider Assigned', color: 'text-primary', bg: 'bg-navy-50' },
    in_progress: { label: 'In Progress', color: 'text-warning', bg: 'bg-amber-50' },
    awaiting_customer_confirmation: { label: 'Awaiting Your Confirmation', color: 'text-blue-700', bg: 'bg-blue-50' },
    completed: { label: 'Completed', color: 'text-success', bg: 'bg-green-50' },
    cancelled: { label: 'Cancelled', color: 'text-danger', bg: 'bg-red-50' },
    disputed: { label: 'Disputed', color: 'text-danger', bg: 'bg-red-50' },
  };
  return map[status] || { label: status, color: 'text-muted-foreground', bg: 'bg-muted' };
}

const ACTIVE_STATUSES: JobStatus[] = ['requested', 'payment_confirmed', 'ready_for_assignment', 'assigned', 'in_progress', 'awaiting_customer_confirmation'];
const COMPLETED_STATUSES: JobStatus[] = ['completed', 'cancelled', 'disputed'];

export default function CustomerDashboardPage() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<AppJob[]>([]);
  const [payments, setPayments] = useState<AppPayment[]>([]);
  const [customerProfile, setCustomerProfile] = useState<{ totalJobs: number; totalSpent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [orders, payments, profile] = await Promise.all([
        customerService.getCustomerOrders(user.id),
        customerService.getCustomerPayments(user.id),
        customerService.getOrCreateProfile(user.id),
      ]);
      setOrders(orders);
      setPayments(payments);
      setCustomerProfile(profile);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Realtime: listen for job status changes on customer's orders
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`customer-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, jobStatus: updated.job_status, providerId: updated.provider_id }
                : o
            )
          );
        }
      )
      // Also listen for new job inserts (e.g., customer just created a booking
      // and navigated directly to the dashboard)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          // Reload all orders to include the new booking
          loadData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.jobStatus));
  const completedOrders = orders.filter((o) => COMPLETED_STATUSES.includes(o.jobStatus));
  const displayName = profile?.fullName || 'Customer';
  const totalSpent = customerProfile?.totalSpent || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm font-semibold text-muted-foreground">My Orders</span>
            <div className="h-4 w-px bg-border hidden sm:block mx-1" />
            <button onClick={loadData} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Refresh">
              <RefreshCw size={20} className="text-muted-foreground" />
            </button>
            {/* Real-time Notification Bell */}
            <NotificationBell />
            <Link href="/help-support" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Help & Support" title="Help & Support">
              <HelpCircle size={20} className="text-muted-foreground" />
            </Link>
            <Link href="/customer-profile" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center" title={displayName}>
              <User size={16} className="text-primary-foreground" />
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
        {/* Welcome Banner */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Welcome back,</p>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{displayName}</h1>
            <p className="text-white/60 text-sm mt-1">{profile?.email}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="glass-card rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-extrabold text-secondary">{orders.length}</p>
              <p className="text-xs text-white/70 mt-0.5">Total Orders</p>
            </div>
            <div className="glass-card rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-extrabold text-secondary">{activeOrders.length}</p>
              <p className="text-xs text-white/70 mt-0.5">Active</p>
            </div>
            <div className="glass-card rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-lg font-extrabold text-secondary">LRD {totalSpent.toLocaleString()}</p>
              <p className="text-xs text-white/70 mt-0.5">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Book Another Service CTA */}
        <div className="mb-8">
          <Link
            href="/service-request-order-form"
            className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold rounded-2xl"
          >
            <Plus size={20} />
            Book Another Service
          </Link>
        </div>

        {/* Profile Info Card */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-foreground">{displayName}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.phone && <p className="text-xs text-muted-foreground mt-0.5">{profile.phone}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Member since</p>
            <p className="text-sm font-semibold text-foreground">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-full sm:w-auto sm:inline-flex">
          {[
            { key: 'active', label: `Active Orders${activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}` },
            { key: 'history', label: `Order History${completedOrders.length > 0 ? ` (${completedOrders.length})` : ''}` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'active' | 'history')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-card border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Active Orders Tab */}
            {activeTab === 'active' && (
              <div>
                {activeOrders.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Package size={28} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">No active orders</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      You don&apos;t have any active service requests right now.
                    </p>
                    <Link href="/service-request-order-form" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
                      <Plus size={16} /> Book a Service
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {activeOrders.map((order) => {
                      const statusDisplay = getStatusDisplay(order.jobStatus);
                      return (
                        <div key={order.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                          <div className="px-5 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-xs font-bold text-primary bg-navy-50 px-2.5 py-1 rounded-full">{order.ref}</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusDisplay.bg} ${statusDisplay.color}`}>
                                  {statusDisplay.label}
                                </span>
                              </div>
                              <h3 className="text-base font-extrabold text-foreground">{order.serviceLabel}</h3>
                            </div>
                            <p className="text-lg font-extrabold text-foreground flex-shrink-0">
                              LRD {order.grossAmount.toLocaleString()}
                            </p>
                          </div>
                          <div className="px-5 py-4 flex flex-col gap-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div className="flex items-start gap-2.5">
                                <MapPin size={15} className="text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{order.address}</p>
                                  <p className="text-xs text-muted-foreground">{order.area}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <Clock size={15} className="text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{order.scheduledDate}</p>
                                  <p className="text-xs text-muted-foreground">{order.scheduledTime}</p>
                                </div>
                              </div>
                            </div>
                            {order.provider && (
                              <div className="flex items-center gap-2 bg-muted/60 rounded-xl px-3 py-2">
                                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                  <User size={13} className="text-primary-foreground" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-foreground">{order.provider.fullName}</p>
                                  <p className="text-xs text-muted-foreground">Your provider</p>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end">
                              <Link
                                href={`/job-progress?jobId=${order.id}`}
                                className="btn-outline px-4 py-2 text-sm flex items-center gap-1.5"
                              >
                                Track Order <ChevronRight size={14} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Order History Tab */}
            {activeTab === 'history' && (
              <div>
                {completedOrders.length === 0 ? (
                  <div className="bg-card rounded-2xl border border-border p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={28} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">No completed orders yet</h3>
                    <p className="text-sm text-muted-foreground">Your completed service history will appear here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {completedOrders.map((order) => {
                      const statusDisplay = getStatusDisplay(order.jobStatus);
                      // Find payment for this order
                      const payment = payments.find((p) => p.jobId === order.id);
                      return (
                        <div key={order.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                          <div className="px-5 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{order.ref}</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusDisplay.bg} ${statusDisplay.color}`}>
                                  {statusDisplay.label}
                                </span>
                              </div>
                              <h3 className="text-base font-extrabold text-foreground">{order.serviceLabel}</h3>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-extrabold text-foreground">LRD {order.grossAmount.toLocaleString()}</p>
                              {payment && (
                                <p className="text-xs text-success font-semibold mt-0.5">
                                  Paid via {payment.channel === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="px-5 py-4 flex flex-col gap-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div className="flex items-start gap-2.5">
                                <MapPin size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{order.address}</p>
                                  <p className="text-xs text-muted-foreground">{order.area}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <Clock size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{order.scheduledDate}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {order.completedAt
                                      ? `Completed ${new Date(order.completedAt).toLocaleDateString()}`
                                      : order.scheduledTime}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {order.provider && (
                              <div className="flex items-center gap-2">
                                <Star size={13} className="text-warning fill-warning flex-shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  Served by <span className="font-semibold text-foreground">{order.provider.fullName}</span>
                                </p>
                              </div>
                            )}
                            {/* Payment receipt info */}
                            {payment && (
                              <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2">
                                <DollarSign size={14} className="text-success flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-success">Payment Receipt</p>
                                  <p className="text-xs text-success/80">Ref: {payment.ref} · LRD {payment.amount.toLocaleString()}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end">
                              <Link
                                href={`/job-progress?jobId=${order.id}`}
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                              >
                                View Details <ChevronRight size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
