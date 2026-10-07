'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowLeft, MapPin, Clock, CheckCircle, Phone, MessageSquare, User, FileText, Loader2, Package, RefreshCw, Camera, AlertTriangle, XCircle, HourglassIcon } from 'lucide-react';
import { toast } from 'sonner';
import { jobService, proofOfWorkService, reviewService } from '@/lib/services/dataService';
import ReviewComponent from '@/components/ui/ReviewComponent';
import DisputeModal from '@/components/ui/DisputeModal';
import CancelOrderModal from '@/components/ui/CancelOrderModal';
import { createClient } from '@/lib/supabase/client';
import type { AppJob, JobStatus } from '@/lib/types/database';

const STATUS_STEPS: { key: JobStatus; label: string; description: string }[] = [
  { key: 'requested', label: 'Requested', description: 'Order received' },
  { key: 'payment_confirmed', label: 'Payment Confirmed', description: 'Payment verified' },
  { key: 'ready_for_assignment', label: 'Ready for Assignment', description: 'Finding provider' },
  { key: 'assigned', label: 'Assigned', description: 'Provider matched' },
  { key: 'in_progress', label: 'In Progress', description: 'Service underway' },
  { key: 'awaiting_customer_confirmation', label: 'Awaiting Your Confirmation', description: 'Provider marked complete' },
  { key: 'completed', label: 'Completed', description: 'Job done' },
];

interface ProofPhoto {
  id: string;
  publicUrl: string;
  fileName: string | null;
}

interface Props {
  jobId?: string;
}

export default function JobProgressPage({ jobId }: Props) {
  const [job, setJob] = useState<AppJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>([]);
  const [existingReview, setExistingReview] = useState<{ rating: number; comment: string | null } | null | undefined>(undefined);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Completely fresh approach: get the authenticated user directly from Supabase
  // Do NOT rely on useAuth context which may have race conditions
  const loadJob = async () => {
    const supabase = createClient();

    // Step 1: Get the authenticated user directly — no context dependency
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      if (mountedRef.current) {
        setError('Please log in to track your job.');
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (mountedRef.current) setCurrentUserId(user.id);

    try {
      let loadedJob: AppJob | null = null;

      if (jobId) {
        // Step 2a: Fetch specific job by ID — simple query, no joins
        const { data, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .eq('customer_id', user.id)
          .maybeSingle();

        if (jobError) {
          console.error('Job fetch error:', jobError);
          throw new Error(jobError.message);
        }

        if (data) {
          // Fetch provider separately if assigned
          let providerData = null;
          if (data.provider_id) {
            const { data: prov } = await supabase
              .from('user_profiles')
              .select('id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at')
              .eq('id', data.provider_id)
              .maybeSingle();
            providerData = prov;
          }
          loadedJob = {
            id: data.id,
            ref: data.ref,
            customerId: data.customer_id,
            providerId: data.provider_id,
            serviceLabel: data.service_label,
            address: data.address,
            area: data.area,
            landmark: data.landmark,
            scheduledDate: data.scheduled_date,
            scheduledTime: data.scheduled_time,
            notes: data.notes,
            quantity: data.quantity,
            grossAmount: data.gross_amount,
            platformFee: data.platform_fee,
            netPayout: data.net_payout,
            jobStatus: data.job_status as JobStatus,
            paymentChannel: data.payment_channel,
            startedAt: data.started_at,
            completedAt: data.completed_at,
            providerCompletedAt: data.provider_completed_at ?? null,
            providerCompletedBy: data.provider_completed_by ?? null,
            customerConfirmedAt: data.customer_confirmed_at ?? null,
            customerConfirmedBy: data.customer_confirmed_by ?? null,
            createdAt: data.created_at,
            provider: providerData ? {
              id: providerData.id,
              email: providerData.email,
              fullName: providerData.full_name,
              phone: providerData.phone,
              avatarUrl: providerData.avatar_url,
              role: providerData.role,
              accountStatus: providerData.account_status,
              isVerified: providerData.is_verified,
              area: providerData.area,
              createdAt: providerData.created_at,
            } : undefined,
          };
        }
      } else {
        // Step 2b: No jobId — find the most recent active job for this customer
        // Simple query: just jobs table, no joins, filter by customer_id
        const { data, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .eq('customer_id', user.id)
          .not('job_status', 'in', '("cancelled","completed")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (jobsError) {
          console.error('Jobs fetch error:', jobsError);
          // Try without the status filter as fallback
          const { data: fallback } = await supabase
            .from('jobs')
            .select('*')
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fallback) {
            let providerData = null;
            if (fallback.provider_id) {
              const { data: prov } = await supabase
                .from('user_profiles')
                .select('id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at')
                .eq('id', fallback.provider_id)
                .maybeSingle();
              providerData = prov;
            }
            loadedJob = {
              id: fallback.id,
              ref: fallback.ref,
              customerId: fallback.customer_id,
              providerId: fallback.provider_id,
              serviceLabel: fallback.service_label,
              address: fallback.address,
              area: fallback.area,
              landmark: fallback.landmark,
              scheduledDate: fallback.scheduled_date,
              scheduledTime: fallback.scheduled_time,
              notes: fallback.notes,
              quantity: fallback.quantity,
              grossAmount: fallback.gross_amount,
              platformFee: fallback.platform_fee,
              netPayout: fallback.net_payout,
              jobStatus: fallback.job_status as JobStatus,
              paymentChannel: fallback.payment_channel,
              startedAt: fallback.started_at,
              completedAt: fallback.completed_at,
              providerCompletedAt: fallback.provider_completed_at ?? null,
              providerCompletedBy: fallback.provider_completed_by ?? null,
              customerConfirmedAt: fallback.customer_confirmed_at ?? null,
              customerConfirmedBy: fallback.customer_confirmed_by ?? null,
              createdAt: fallback.created_at,
              provider: providerData ? {
                id: providerData.id,
                email: providerData.email,
                fullName: providerData.full_name,
                phone: providerData.phone,
                avatarUrl: providerData.avatar_url,
                role: providerData.role,
                accountStatus: providerData.account_status,
                isVerified: providerData.is_verified,
                area: providerData.area,
                createdAt: providerData.created_at,
              } : undefined,
            };
          }
        } else if (data) {
          let providerData = null;
          if (data.provider_id) {
            const { data: prov } = await supabase
              .from('user_profiles')
              .select('id, full_name, phone, area, is_verified, role, email, account_status, avatar_url, created_at')
              .eq('id', data.provider_id)
              .maybeSingle();
            providerData = prov;
          }
          loadedJob = {
            id: data.id,
            ref: data.ref,
            customerId: data.customer_id,
            providerId: data.provider_id,
            serviceLabel: data.service_label,
            address: data.address,
            area: data.area,
            landmark: data.landmark,
            scheduledDate: data.scheduled_date,
            scheduledTime: data.scheduled_time,
            notes: data.notes,
            quantity: data.quantity,
            grossAmount: data.gross_amount,
            platformFee: data.platform_fee,
            netPayout: data.net_payout,
            jobStatus: data.job_status as JobStatus,
            paymentChannel: data.payment_channel,
            startedAt: data.started_at,
            completedAt: data.completed_at,
            providerCompletedAt: data.provider_completed_at ?? null,
            providerCompletedBy: data.provider_completed_by ?? null,
            customerConfirmedAt: data.customer_confirmed_at ?? null,
            customerConfirmedBy: data.customer_confirmed_by ?? null,
            createdAt: data.created_at,
            provider: providerData ? {
              id: providerData.id,
              email: providerData.email,
              fullName: providerData.full_name,
              phone: providerData.phone,
              avatarUrl: providerData.avatar_url,
              role: providerData.role,
              accountStatus: providerData.account_status,
              isVerified: providerData.is_verified,
              area: providerData.area,
              createdAt: providerData.created_at,
            } : undefined,
          };
        }
      }

      if (!mountedRef.current) return;
      setJob(loadedJob);
      setError(null);

      // Load proof photos if job is in relevant status
      if (loadedJob && (['in_progress', 'awaiting_customer_confirmation', 'completed'] as JobStatus[]).includes(loadedJob.jobStatus)) {
        const photos = await proofOfWorkService.getJobPhotos(loadedJob.id);
        if (mountedRef.current) setProofPhotos(photos);
      }

      // Load review state if completed
      if (loadedJob?.jobStatus === 'completed') {
        const review = await reviewService.getReviewForJob(loadedJob.id, user.id);
        if (mountedRef.current) setExistingReview(review);
      }
    } catch (err: any) {
      console.error('loadJob error:', err);
      if (mountedRef.current) setError('Could not load job details. Please try again.');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Run on mount and whenever jobId changes — no auth context dependency
  useEffect(() => {
    loadJob();
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: subscribe to job status changes
  useEffect(() => {
    if (!job?.id) return;
    const supabase = createClient();
    const jobChannel = supabase
      .channel(`job-progress-${job.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${job.id}` },
        (payload) => {
          const updated = payload.new as any;
          setJob((prev) => prev ? {
            ...prev,
            jobStatus: updated.job_status as JobStatus,
            providerId: updated.provider_id,
            providerCompletedAt: updated.provider_completed_at ?? prev.providerCompletedAt,
            customerConfirmedAt: updated.customer_confirmed_at ?? prev.customerConfirmedAt,
            completedAt: updated.completed_at ?? prev.completedAt,
          } : prev);
          if (updated.job_status === 'awaiting_customer_confirmation' && job) {
            proofOfWorkService.getJobPhotos(job.id).then(setProofPhotos);
          }
          if (updated.job_status === 'completed' && currentUserId) {
            reviewService.getReviewForJob(job.id, currentUserId).then(setExistingReview);
          }
        }
      )
      .subscribe();

    const proofChannel = supabase
      .channel(`proof-photos-${job.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proof_of_work', filter: `job_id=eq.${job.id}` },
        (payload) => {
          const row = payload.new as any;
          setProofPhotos((prev) => {
            if (prev.find((p) => p.id === row.id)) return prev;
            return [...prev, { id: row.id, publicUrl: row.public_url, fileName: row.file_name }];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'proof_of_work', filter: `job_id=eq.${job.id}` },
        (payload) => {
          const row = payload.old as any;
          setProofPhotos((prev) => prev.filter((p) => p.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(proofChannel);
    };
  }, [job?.id, currentUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJob();
  };

  const handleConfirmCompletion = async () => {
    if (!job) return;
    setIsConfirming(true);
    try {
      const result = await jobService.customerConfirmCompletion(job.id);
      if (result.success) {
        setJob((prev) => prev ? { ...prev, jobStatus: 'completed' } : prev);
        toast.success('Job confirmed complete! Thank you.');
        if (currentUserId) {
          const review = await reviewService.getReviewForJob(job.id, currentUserId);
          setExistingReview(review);
        }
      } else {
        toast.error(result.error || 'Could not confirm completion. Please try again.');
      }
    } catch {
      toast.error('Failed to confirm completion.');
    } finally {
      setIsConfirming(false);
    }
  };

  const currentStatus = job?.jobStatus || 'requested';
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  const showProvider = currentStepIdx >= STATUS_STEPS.findIndex((s) => s.key === 'assigned');
  const showProofPhotos = proofPhotos.length > 0 && (['in_progress', 'awaiting_customer_confirmation', 'completed'] as JobStatus[]).includes(currentStatus);
  const isAwaitingConfirmation = currentStatus === 'awaiting_customer_confirmation';
  const canCancel = ['requested', 'payment_confirmed', 'ready_for_assignment'].includes(currentStatus);
  const canDispute = ['in_progress', 'awaiting_customer_confirmation', 'assigned'].includes(currentStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">No Active Job Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error || "You don't have any active jobs to track right now."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefresh}
              className="w-full py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Try Again
            </button>
            <Link href="/customer-dashboard" className="btn-primary px-6 py-3 text-center block">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customer-dashboard" className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <div className="h-5 w-px bg-border" />
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={26} />
              <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
            </Link>
          </div>
          <h1 className="text-sm font-bold text-foreground">Track My Job</h1>
          <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Refresh">
            <RefreshCw size={18} className={`text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 flex flex-col gap-5">
        {/* Job Reference Banner */}
        <div className="gradient-hero rounded-2xl p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Job Reference</p>
              <p className="text-white font-extrabold text-lg tabular-nums">{job.ref}</p>
              <p className="text-white/80 text-sm mt-1 font-medium">{job.serviceLabel}</p>
            </div>
            <div className="flex-shrink-0">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                currentStatus === 'completed' ? 'bg-success/20 text-green-200'
                  : currentStatus === 'awaiting_customer_confirmation' ? 'bg-blue-500/20 text-blue-200'
                  : currentStatus === 'in_progress' ? 'bg-secondary/20 text-secondary'
                  : currentStatus === 'cancelled' ? 'bg-red-500/20 text-red-200'
                  : currentStatus === 'disputed' ? 'bg-orange-500/20 text-orange-200' : 'bg-white/10 text-white/80'
              }`}>
                {STATUS_STEPS.find((s) => s.key === currentStatus)?.label ?? currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Cancelled / Disputed notice */}
        {currentStatus === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <XCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-danger">Order Cancelled</p>
              <p className="text-xs text-muted-foreground mt-1">This order has been cancelled. If you paid, a refund will be processed within 3–5 business days.</p>
            </div>
          </div>
        )}
        {currentStatus === 'disputed' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-warning">Dispute Under Review</p>
              <p className="text-xs text-muted-foreground mt-1">Our admin team is reviewing your dispute. We'll notify you of the outcome within 24–48 hours.</p>
            </div>
          </div>
        )}

        {/* Status Stepper */}
        {currentStatus !== 'cancelled' && currentStatus !== 'disputed' && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Job Progress</h2>
                  <p className="text-xs text-muted-foreground">Step {currentStepIdx + 1} of {STATUS_STEPS.length}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="flex flex-col gap-0">
                {STATUS_STEPS.map((step, idx) => {
                  const isDone = currentStepIdx > idx;
                  const isActive = currentStepIdx === idx;
                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                          isDone ? 'status-step-completed' : isActive ? 'status-step-active' : 'status-step-pending'
                        }`}>
                          {isDone ? <CheckCircle size={14} /> : idx + 1}
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[28px] my-1 transition-all duration-500 ${isDone ? 'bg-success' : 'bg-border'}`} />
                        )}
                      </div>
                      <div className={`pb-5 flex-1 ${idx === STATUS_STEPS.length - 1 ? 'pb-1' : ''}`}>
                        <p className={`text-sm font-bold leading-tight ${isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary bg-navy-50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Awaiting Customer Confirmation — Action Card */}
        {isAwaitingConfirmation && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-blue-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <HourglassIcon size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-blue-800">Provider Marked Job Complete</h2>
                <p className="text-xs text-blue-600">Please review the work and confirm or report an issue</p>
              </div>
            </div>
            <div className="px-5 py-5 flex flex-col gap-3">
              <p className="text-sm text-blue-700">
                Your provider has indicated that the work is done.
                {proofPhotos.length > 0 ? ` They uploaded ${proofPhotos.length} proof photo${proofPhotos.length !== 1 ? 's' : ''} below.` : ''}
                {' '}Please confirm if you are satisfied with the work.
              </p>
              <button
                onClick={handleConfirmCompletion}
                disabled={isConfirming}
                className="w-full py-3.5 rounded-xl bg-success text-white text-sm font-bold hover:bg-success/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isConfirming ? <><Loader2 size={16} className="animate-spin" /> Confirming...</> : <><CheckCircle size={18} /> Confirm Completion</>}
              </button>
              <button
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-3 rounded-xl border border-warning/50 text-warning text-sm font-bold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={17} /> Report an Issue
              </button>
            </div>
          </div>
        )}

        {/* Proof of Work Photos */}
        {showProofPhotos && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <Camera size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-foreground">Proof of Work</h2>
                <p className="text-xs text-muted-foreground">{proofPhotos.length} photo{proofPhotos.length !== 1 ? 's' : ''} uploaded by provider</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                {proofPhotos.map((photo) => (
                  <div key={photo.id} className="relative rounded-xl overflow-hidden bg-muted aspect-square">
                    <img
                      src={photo.publicUrl}
                      alt={photo.fileName || 'Proof of work photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Job Details Card */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <h2 className="text-base font-extrabold text-foreground">Job Details</h2>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <MapPin size={17} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{job.address}</p>
                <p className="text-xs text-muted-foreground">{job.area}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={17} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{job.scheduledDate}</p>
                <p className="text-xs text-muted-foreground">{job.scheduledTime}</p>
              </div>
            </div>
            {job.notes && (
              <div className="bg-muted/60 rounded-xl p-3.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Your Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{job.notes}</p>
              </div>
            )}
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Service Amount</span>
                <span className="font-semibold text-foreground">LRD {job.grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-semibold text-foreground">LRD {job.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 mt-1">
                <span className="text-foreground">Total Paid</span>
                <span className="text-primary">LRD {(job.grossAmount + job.platformFee).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Card */}
        {showProvider && job.provider && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Your Provider</h2>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-base flex-shrink-0">
                  {job.provider.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold text-foreground">{job.provider.fullName}</p>
                  <p className="text-xs text-muted-foreground">{job.provider.area || 'Service Provider'}</p>
                </div>
                {job.provider.isVerified && (
                  <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full flex-shrink-0">✓ Verified</span>
                )}
              </div>
              <div className="flex gap-3">
                <a href={`tel:${job.provider.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                  <Phone size={16} /> Call
                </a>
                <a href={`sms:${job.provider.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors">
                  <MessageSquare size={16} /> SMS
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canCancel && currentStatus !== 'cancelled' && currentStatus !== 'disputed' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-3 rounded-xl border border-danger/40 text-danger text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle size={17} /> Cancel Order
            </button>
          </div>
        )}

        {canDispute && !isAwaitingConfirmation && currentStatus !== 'cancelled' && currentStatus !== 'disputed' && (
          <button
            onClick={() => setShowDisputeModal(true)}
            className="w-full py-3 rounded-xl border border-warning/40 text-warning text-sm font-bold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle size={17} /> Report an Issue
          </button>
        )}

        {/* Review */}
        {currentStatus === 'completed' && currentUserId && job.provider && (
          existingReview ? (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center">
              <CheckCircle size={24} className="text-success mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">You rated this job {existingReview.rating} star{existingReview.rating !== 1 ? 's' : ''}</p>
              {existingReview.comment && (
                <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{existingReview.comment}&rdquo;</p>
              )}
            </div>
          ) : existingReview === null ? (
            <ReviewComponent
              jobId={job.id}
              reviewerId={currentUserId}
              revieweeId={job.providerId!}
              revieweeName={job.provider.fullName}
              reviewerRole="customer"
              onReviewSubmitted={() => setExistingReview({ rating: 0, comment: null })}
            />
          ) : null
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && job && (
        <DisputeModal
          jobId={job.id}
          jobRef={job.ref}
          raisedByRole="customer"
          onClose={() => setShowDisputeModal(false)}
          onDisputeFiled={() => {
            setJob((prev) => prev ? { ...prev, jobStatus: 'disputed' } : prev);
          }}
        />
      )}

      {/* Cancel Modal */}
      {showCancelModal && job && (
        <CancelOrderModal
          jobId={job.id}
          jobRef={job.ref}
          mode="cancel"
          grossAmount={job.grossAmount}
          jobStatus={job.jobStatus}
          onClose={() => setShowCancelModal(false)}
          onConfirmed={() => {
            setJob((prev) => prev ? { ...prev, jobStatus: 'cancelled' } : prev);
          }}
        />
      )}
    </div>
  );
}
