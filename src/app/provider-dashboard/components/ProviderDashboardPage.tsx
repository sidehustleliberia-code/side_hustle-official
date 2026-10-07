'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import NotificationBell from '@/components/ui/NotificationBell';
import AvailabilityToggle from '@/components/ui/AvailabilityToggle';
import {
  User, MapPin, Clock, DollarSign, CheckCircle,
  Briefcase, Star, ChevronRight, Loader2, Settings, TrendingUp, RefreshCw, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { jobService, providerService, reviewService } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import type { AppJob, AppProviderProfile } from '@/lib/types/database';

/** Format Liberian Dollar amounts with a fixed locale to prevent SSR/client hydration mismatch */
const formatLRD = (amount: number) => amount.toLocaleString('en-US');

export default function ProviderDashboardPage() {
  const { user, profile } = useAuth();
  const [availableJobs, setAvailableJobs] = useState<AppJob[]>([]);
  const [providerProfile, setProviderProfile] = useState<AppProviderProfile | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avgRating, setAvgRating] = useState<{ average: number; count: number }>({ average: 0, count: 0 });

  // Keep a ref to isAvailable so Realtime callbacks always read the latest value
  // without needing to re-subscribe every time availability changes.
  const isAvailableRef = useRef<boolean>(true);

  const loadData = async () => {
    if (!user) return;
    try {
      const [jobs, pProfile, ratingData] = await Promise.all([
        jobService.getAvailableJobs(),
        providerService.getProfile(user.id),
        reviewService.getAverageRating(user.id),
      ]);
      setAvailableJobs(jobs);
      setProviderProfile(pProfile);
      // Sync the ref whenever we load fresh profile data
      isAvailableRef.current = pProfile?.isAvailable ?? true;
      setAvgRating(ratingData);
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Realtime: listen for new available jobs and job status changes.
  // Subscribes once per user session. Uses isAvailableRef (not state) so
  // the callback always reads the current availability without re-subscribing.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const handleJobChange = (payload: any) => {
      const updated = payload.new as any;

      if (updated.job_status === 'ready_for_assignment' && updated.provider_id === null) {
        // Job became available — only show it if provider is currently online
        if (!isAvailableRef.current) return;

        setAvailableJobs((prev) => {
          if (prev.find((j) => j.id === updated.id)) return prev;
          return [
            {
              id: updated.id,
              ref: updated.ref,
              customerId: updated.customer_id,
              providerId: updated.provider_id,
              serviceLabel: updated.service_label,
              address: updated.address,
              area: updated.area,
              landmark: updated.landmark,
              scheduledDate: updated.scheduled_date,
              scheduledTime: updated.scheduled_time,
              notes: updated.notes,
              quantity: updated.quantity,
              grossAmount: updated.gross_amount,
              platformFee: updated.platform_fee,
              netPayout: updated.net_payout,
              jobStatus: updated.job_status,
              paymentChannel: updated.payment_channel,
              startedAt: updated.started_at,
              completedAt: updated.completed_at,
              providerCompletedAt: updated.provider_completed_at ?? null,
              providerCompletedBy: updated.provider_completed_by ?? null,
              customerConfirmedAt: updated.customer_confirmed_at ?? null,
              customerConfirmedBy: updated.customer_confirmed_by ?? null,
              createdAt: updated.created_at,
            },
            ...prev,
          ];
        });
        toast.success('New job available near you!');
      } else {
        // Job status changed away from ready_for_assignment — remove from feed
        setAvailableJobs((prev) => prev.filter((j) => j.id !== updated.id));
      }
    };

    // Use user-specific channel name to avoid conflicts between multiple providers
    const channel = supabase
      .channel(`provider-dashboard-jobs-${user.id}`)
      // Listen to INSERT events: catches jobs created directly as ready_for_assignment
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        handleJobChange
      )
      // Listen to UPDATE events: catches jobs transitioning to ready_for_assignment
      // after payment confirmation, and jobs being assigned/removed from feed
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs' },
        handleJobChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Only re-subscribe when user changes — availability handled via ref

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleAcceptJob = async (job: AppJob) => {
    if (!user) return;
    // Frontend guard: prevent offline providers from accepting jobs
    if (!providerProfile?.isAvailable) {
      toast.error('You must be Online to accept jobs. Toggle your availability above.');
      return;
    }
    setAcceptingId(job.id);
    try {
      const result = await jobService.acceptJob(job.id, user.id);
      if (result.success) {
        setAvailableJobs((prev) => prev.filter((j) => j.id !== job.id));
        toast.success(`Job ${job.ref} accepted! Check your active jobs.`);
      } else {
        // Show the actual error from the RPC (e.g., "pending verification", "offline", etc.)
        toast.error(result.error || 'Could not accept this job. It may have already been taken.');
      }
    } catch {
      toast.error('Failed to accept job. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  /** Handle availability toggle — updates local state and ref immediately */
  const handleAvailabilityToggle = (newState: boolean) => {
    isAvailableRef.current = newState;
    setProviderProfile((prev) => prev ? { ...prev, isAvailable: newState } : prev);
    // If going offline, clear the available jobs feed (they shouldn't see new jobs)
    if (!newState) {
      setAvailableJobs([]);
    } else {
      // Coming back online — reload jobs
      loadData();
    }
  };

  const displayName = profile?.fullName || 'Provider';
  const displayArea = providerProfile?.serviceArea || profile?.area || 'Monrovia';
  const totalJobs = providerProfile?.totalJobs || 0;
  const displayRating = avgRating.count > 0 ? avgRating.average : (providerProfile?.rating || 0);
  const currentBalance = providerProfile?.currentBalance || 0;
  const totalEarned = providerProfile?.totalEarned || 0;
  const isAvailable = providerProfile?.isAvailable ?? true;

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
            <span className="hidden sm:block text-sm font-semibold text-muted-foreground">Provider Portal</span>
            <div className="h-4 w-px bg-border hidden sm:block mx-1" />

            {/* Online/Offline Availability Toggle */}
            {user && providerProfile !== null && (
              <AvailabilityToggle
                userId={user.id}
                isAvailable={isAvailable}
                onToggle={handleAvailabilityToggle}
              />
            )}

            <Link href="/provider-earnings" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Earnings & Payouts" title="Earnings & Payouts">
              <TrendingUp size={20} className="text-muted-foreground" />
            </Link>
            <Link href="/provider-profile" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Profile Settings" title="Profile Settings">
              <Settings size={20} className="text-muted-foreground" />
            </Link>
            <Link href="/help-support" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Help & Support" title="Help & Support">
              <HelpCircle size={20} className="text-muted-foreground" />
            </Link>
            <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-muted transition-colors relative" aria-label="Refresh">
              <RefreshCw size={20} className={`text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Real-time Notification Bell */}
            <NotificationBell />

            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User size={16} className="text-primary-foreground" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 lg:px-10 py-6 lg:py-10">
        {/* Welcome Banner */}
        <div className="gradient-hero rounded-2xl p-6 lg:p-8 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">Welcome back,</p>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">{displayName}</h1>
            <p className="text-white/60 text-sm mt-1">Provider · {displayArea}</p>
            {/* Availability status indicator in banner */}
            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isAvailable ? 'bg-success/20 text-success' : 'bg-white/10 text-white/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-success' : 'bg-white/40'}`} />
              {isAvailable ? 'Online — accepting new jobs' : 'Offline — not accepting new jobs'}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="glass-card rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-2xl font-extrabold text-secondary">{totalJobs}</p>
              <p className="text-xs text-white/70 mt-0.5">Jobs Done</p>
            </div>
            {displayRating > 0 && (
              <div className="glass-card rounded-xl px-4 py-3 text-center min-w-[90px]">
                <div className="flex items-center justify-center gap-1">
                  <Star size={14} className="text-secondary fill-secondary" />
                  <p className="text-2xl font-extrabold text-secondary">{displayRating.toFixed(1)}</p>
                </div>
                <p className="text-xs text-white/70 mt-0.5">
                  {avgRating.count > 0 ? `${avgRating.count} review${avgRating.count !== 1 ? 's' : ''}` : 'Rating'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Available Jobs', value: String(availableJobs.length), icon: Briefcase, color: 'text-primary', bg: 'bg-navy-50' },
            { label: 'Jobs Completed', value: String(totalJobs), icon: CheckCircle, color: 'text-success', bg: 'bg-green-50' },
            { label: 'Current Balance', value: `LRD ${formatLRD(currentBalance)}`, icon: DollarSign, color: 'text-warning', bg: 'bg-amber-50' },
            { label: 'Total Earned', value: `LRD ${formatLRD(totalEarned)}`, icon: DollarSign, color: 'text-primary', bg: 'bg-navy-50' },
          ].map((stat) => (
            <div key={`stat-${stat.label}`} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Offline Banner — shown when provider is offline */}
        {!isAvailable && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🔴</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">You are currently Offline</p>
              <p className="text-xs text-amber-700 mt-0.5">
                New job offers are paused. Your existing active jobs are not affected. Toggle Online above to start receiving new jobs.
              </p>
            </div>
          </div>
        )}

        {/* Jobs Feed */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Available Jobs Near You</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {!isAvailable
                ? 'Go Online to see and accept new jobs'
                : availableJobs.length > 0
                ? `${availableJobs.length} paid job${availableJobs.length !== 1 ? 's' : ''} waiting for a provider`
                : 'No new jobs right now — check back soon'}
            </p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            isAvailable ? 'text-primary bg-navy-50' : 'text-muted-foreground bg-muted'
          }`}>
            {isAvailable ? 'Live Feed' : 'Paused'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : availableJobs.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} className="text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">
              {isAvailable ? 'All caught up!' : 'You are Offline'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAvailable
                ? "You've accepted all available jobs. New requests will appear here automatically." :'Toggle Online above to start receiving new job offers.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {availableJobs.map((job) => (
              <div key={job.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden card-hover">
                <div className="px-5 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs font-bold text-primary bg-navy-50 px-2.5 py-1 rounded-full">{job.ref}</span>
                    </div>
                    <h3 className="text-base font-extrabold text-foreground">{job.serviceLabel}</h3>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Your payout</p>
                    <p className="text-xl font-extrabold text-success">LRD {formatLRD(job.netPayout)}</p>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{job.address}</p>
                        <p className="text-xs text-muted-foreground">{job.area}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Clock size={16} className="text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{job.scheduledDate}</p>
                        <p className="text-xs text-muted-foreground">{job.scheduledTime}</p>
                      </div>
                    </div>
                  </div>

                  {job.notes && (
                    <div className="bg-muted/60 rounded-xl p-3">
                      <p className="text-xs text-foreground leading-relaxed">{job.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-muted-foreground">
                        Job value: <span className="font-semibold text-foreground">LRD {formatLRD(job.grossAmount)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Platform fee: <span className="font-semibold text-foreground">LRD {formatLRD(job.platformFee)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptJob(job)}
                      disabled={acceptingId === job.id || !isAvailable}
                      className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {acceptingId === job.id ? (
                        <><Loader2 size={15} className="animate-spin" /> Accepting...</>
                      ) : (
                        <>Accept Job <ChevronRight size={15} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Job Notice */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Have an active job?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Track progress, contact customer, and upload proof of work.</p>
          </div>
          <Link href="/active-job" className="btn-outline px-4 py-2.5 text-sm flex items-center gap-2 flex-shrink-0">
            View Active <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
