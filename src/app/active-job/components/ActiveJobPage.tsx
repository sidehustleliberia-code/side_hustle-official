'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { ArrowLeft, MapPin, Clock, Phone, MessageSquare, CheckCircle, Loader2, Camera, Upload, X, PlayCircle, Flag, User, FileText, AlertTriangle, XCircle, HourglassIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { jobService, proofOfWorkService } from '@/lib/services/dataService';
import ReviewComponent from '@/components/ui/ReviewComponent';
import DisputeModal from '@/components/ui/DisputeModal';
import CancelOrderModal from '@/components/ui/CancelOrderModal';
import { createClient } from '@/lib/supabase/client';
import type { AppJob, JobStatus } from '@/lib/types/database';

type LocalJobStatus = 'accepted' | 'in_progress' | 'awaiting_customer_confirmation' | 'completed' | 'cancelled' | 'disputed';

const STATUS_STEPS: { key: LocalJobStatus; label: string; short: string }[] = [
  { key: 'accepted', label: 'Job Accepted', short: 'Accepted' },
  { key: 'in_progress', label: 'In Progress', short: 'In Progress' },
  { key: 'awaiting_customer_confirmation', label: 'Awaiting Confirmation', short: 'Awaiting' },
  { key: 'completed', label: 'Completed', short: 'Completed' },
];

function dbStatusToLocal(s: JobStatus): LocalJobStatus {
  if (s === 'in_progress') return 'in_progress';
  if (s === 'awaiting_customer_confirmation') return 'awaiting_customer_confirmation';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'disputed') return 'disputed';
  return 'accepted';
}

interface ProofPhoto {
  id: string;
  publicUrl: string;
  storagePath: string;
  fileName: string | null;
  localUrl?: string;
  uploading?: boolean;
}

export default function ActiveJobPage() {
  const { user } = useAuth();
  const [job, setJob] = useState<AppJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [status, setStatus] = useState<LocalJobStatus>('accepted');
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [proofPhotos, setProofPhotos] = useState<ProofPhoto[]>([]);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    jobService.getProviderActiveJob(user.id).then(async (j) => {
      if (isCancelled) return;
      setJob(j);
      if (j) {
        setStatus(dbStatusToLocal(j.jobStatus));
        const photos = await proofOfWorkService.getJobPhotos(j.id);
        if (isCancelled) return;
        setProofPhotos(photos.map((p) => ({
          id: p.id,
          publicUrl: p.publicUrl,
          storagePath: p.storagePath,
          fileName: p.fileName,
        })));
      }
      setLoading(false);
    });
    return () => { isCancelled = true; };
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!job?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`active-job-${job.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${job.id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.job_status) {
            const newLocal = dbStatusToLocal(updated.job_status as JobStatus);
            setStatus(newLocal);
            setJob((prev) => prev ? {
              ...prev,
              jobStatus: updated.job_status,
              providerCompletedAt: updated.provider_completed_at ?? prev.providerCompletedAt,
              customerConfirmedAt: updated.customer_confirmed_at ?? prev.customerConfirmedAt,
              completedAt: updated.completed_at ?? prev.completedAt,
            } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [job?.id]);

  const handleStartJob = async () => {
    if (!job) return;
    setIsStarting(true);
    try {
      const success = await jobService.updateJobStatus(job.id, 'in_progress');
      if (success) {
        setStatus('in_progress');
        setJob((prev) => prev ? { ...prev, jobStatus: 'in_progress' } : prev);
        toast.success('Job started! Customer has been notified.');
      } else {
        toast.error('Could not start job. Please try again.');
      }
    } catch {
      toast.error('Failed to update job status.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!job) return;

    // Require at least one proof photo
    const uploadedPhotos = proofPhotos.filter((p) => !p.uploading);
    if (uploadedPhotos.length === 0) {
      toast.error('Please upload at least one proof-of-work photo before marking complete.');
      return;
    }

    setIsCompleting(true);
    try {
      const result = await jobService.providerMarkComplete(job.id);
      if (result.success) {
        setStatus('awaiting_customer_confirmation');
        setJob((prev) => prev ? { ...prev, jobStatus: 'awaiting_customer_confirmation' } : prev);
        toast.success('Job marked complete! Waiting for customer confirmation.');
      } else {
        toast.error(result.error || 'Could not mark job complete. Please try again.');
      }
    } catch {
      toast.error('Failed to update job status.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!job || !user) return;
    const files = Array.from(e.target.files || []);
    if (proofPhotos.length + files.length > 4) {
      toast.error('Maximum 4 proof photos allowed');
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';

    for (const file of files) {
      const localUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setProofPhotos((prev) => [
        ...prev,
        { id: tempId, publicUrl: localUrl, storagePath: '', fileName: file.name, localUrl, uploading: true },
      ]);

      const result = await proofOfWorkService.uploadPhoto(job.id, user.id, file);
      if (result) {
        setProofPhotos((prev) =>
          prev.map((p) =>
            p.id === tempId
              ? { id: result.id, publicUrl: result.publicUrl, storagePath: result.storagePath || '', fileName: file.name }
              : p
          )
        );
        toast.success(`Photo uploaded successfully`);
      } else {
        setProofPhotos((prev) => prev.filter((p) => p.id !== tempId));
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeProof = async (photo: ProofPhoto) => {
    if (photo.uploading) return;
    setProofPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (photo.storagePath) {
      await proofOfWorkService.deletePhoto(photo.id, photo.storagePath);
    }
  };

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  // Provider can dispute once job is in progress
  const canDispute = status === 'in_progress';
  // Provider can decline when job is still in accepted state
  const canDecline = status === 'accepted';

  if (loading) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-background flex items-center justify-center">
        {isMounted && <Loader2 size={32} className="animate-spin text-primary" />}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BriefcaseIcon size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">No Active Job</h2>
          <p className="text-sm text-muted-foreground mb-6">You don&apos;t have any active or assigned jobs right now.</p>
          <Link href="/provider-dashboard" className="btn-primary px-6 py-3">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const customer = job.customer;

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
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
            status === 'completed' ? 'bg-success/10 text-success'
              : status === 'awaiting_customer_confirmation' ? 'bg-blue-100 text-blue-700'
              : status === 'in_progress' ? 'bg-warning/10 text-warning'
              : status === 'cancelled' ? 'bg-red-100 text-danger'
              : status === 'disputed' ? 'bg-orange-100 text-warning' : 'bg-navy-50 text-primary'
          }`}>
            {STATUS_STEPS.find((s) => s.key === status)?.label ?? status.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 flex flex-col gap-5">
        {/* Job Reference + Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-primary bg-navy-50 inline-block px-2.5 py-1 rounded-full mb-1.5">{job.ref}</p>
              <h1 className="text-xl font-extrabold text-foreground">{job.serviceLabel}</h1>
            </div>
          </div>

          {/* Cancelled / Disputed notice */}
          {status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 mt-3">
              <XCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-danger">Job Cancelled</p>
                <p className="text-xs text-muted-foreground mt-0.5">This job has been cancelled and returned to the queue.</p>
              </div>
            </div>
          )}
          {status === 'disputed' && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3 mt-3">
              <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-warning">Dispute Under Review</p>
                <p className="text-xs text-muted-foreground mt-0.5">Our admin team is reviewing the dispute. You'll be notified of the outcome.</p>
              </div>
            </div>
          )}

          {/* Progress stepper (only for active statuses) */}
          {status !== 'cancelled' && status !== 'disputed' && (
            <div className="flex items-center gap-0 mt-4">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = currentStepIdx > idx;
                const isActive = currentStepIdx === idx;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                        isDone ? 'status-step-completed' : isActive ? 'status-step-active' : 'status-step-pending'
                      }`}>
                        {isDone ? <CheckCircle size={14} /> : idx + 1}
                      </div>
                      <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-primary' : isDone ? 'text-success' : 'text-muted-foreground'}`}>
                        {step.short}
                      </span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 mx-2 transition-all duration-500 ${isDone ? 'bg-success' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Awaiting Customer Confirmation Banner */}
        {status === 'awaiting_customer_confirmation' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <HourglassIcon size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-700">Awaiting Customer Confirmation</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have marked this job complete. The customer has been notified and needs to confirm the work.
                Your payout will be processed once they confirm.
              </p>
            </div>
          </div>
        )}

        {/* Job Details */}
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
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Customer Notes</p>
                <p className="text-sm text-foreground leading-relaxed">{job.notes}</p>
              </div>
            )}
            <div className="border-t border-border pt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Job Value</span>
                <span className="font-semibold text-foreground">LRD {job.grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (10%)</span>
                <span className="font-semibold text-foreground">LRD {job.platformFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold border-t border-border pt-2 mt-1">
                <span className="text-foreground">Your Payout</span>
                <span className="text-success text-base">LRD {job.netPayout.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Contact */}
        {customer && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <h2 className="text-base font-extrabold text-foreground">Customer</h2>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm flex-shrink-0">
                  {customer.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{customer.fullName}</p>
                  <p className="text-xs text-muted-foreground">{customer.phone || 'No phone on file'}</p>
                </div>
              </div>
              {customer.phone && (
                <div className="flex gap-3">
                  <a href={`tel:${customer.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                    <Phone size={16} /> Call
                  </a>
                  <a href={`sms:${customer.phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-foreground text-sm font-bold hover:bg-muted transition-colors">
                    <MessageSquare size={16} /> SMS
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proof of Work Upload — visible when in_progress or awaiting confirmation */}
        {(status === 'in_progress' || status === 'awaiting_customer_confirmation') && (
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                <Camera size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-foreground">Proof of Work</h2>
                <p className="text-xs text-muted-foreground">{proofPhotos.filter(p => !p.uploading).length}/4 photos uploaded</p>
              </div>
            </div>
            <div className="px-5 py-4">
              {proofPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {proofPhotos.map((photo) => (
                    <div key={photo.id} className="relative rounded-xl overflow-hidden bg-muted aspect-square">
                      <img
                        src={photo.localUrl || photo.publicUrl}
                        alt={photo.fileName || 'Proof of work photo'}
                        className="w-full h-full object-cover"
                      />
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                        </div>
                      )}
                      {!photo.uploading && status === 'in_progress' && (
                        <button
                          onClick={() => removeProof(photo)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                          aria-label="Remove photo"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {proofPhotos.length < 4 && status === 'in_progress' && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload size={18} /> Upload Photos
                  </button>
                </>
              )}
              {status === 'awaiting_customer_confirmation' && proofPhotos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No photos uploaded.</p>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        {status === 'accepted' && (
          <button onClick={handleStartJob} disabled={isStarting} className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2">
            {isStarting ? <><Loader2 size={18} className="animate-spin" /> Starting...</> : <><PlayCircle size={20} /> Start Job</>}
          </button>
        )}
        {status === 'in_progress' && (
          <div className="flex flex-col gap-2">
            {proofPhotos.filter(p => !p.uploading).length === 0 && (
              <p className="text-xs text-muted-foreground text-center">Upload at least 1 proof photo to mark complete</p>
            )}
            <button
              onClick={handleMarkCompleted}
              disabled={isCompleting || proofPhotos.filter(p => !p.uploading).length === 0}
              className="btn-primary w-full py-4 text-base font-bold bg-success hover:bg-success/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><Flag size={20} /> Mark as Completed</>}
            </button>
          </div>
        )}
        {status === 'awaiting_customer_confirmation' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
            <HourglassIcon size={32} className="text-blue-500 mx-auto mb-3" />
            <p className="text-base font-bold text-foreground mb-1">Waiting for Customer</p>
            <p className="text-sm text-muted-foreground">The customer has been notified and must confirm your work before your payout is released.</p>
          </div>
        )}
        {status === 'completed' && (
          <>
            <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center">
              <CheckCircle size={32} className="text-success mx-auto mb-3" />
              <p className="text-base font-bold text-foreground mb-1">Job Completed!</p>
              <p className="text-sm text-muted-foreground">Your payout of LRD {job.netPayout.toLocaleString()} has been processed.</p>
            </div>
            {user && customer && (
              <ReviewComponent
                jobId={job.id}
                reviewerId={user.id}
                revieweeId={job.customerId}
                revieweeName={customer.fullName}
                reviewerRole="provider"
              />
            )}
          </>
        )}

        {/* Secondary Action Buttons: Decline & Dispute */}
        {(canDecline || canDispute) && (
          <div className="flex flex-col gap-3">
            {canDecline && (
              <button
                onClick={() => setShowDeclineModal(true)}
                className="w-full py-3 rounded-xl border border-danger/40 text-danger text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={17} /> Decline Job
              </button>
            )}
            {canDispute && (
              <button
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-3 rounded-xl border border-warning/40 text-warning text-sm font-bold hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={17} /> Report an Issue
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && job && (
        <DisputeModal
          jobId={job.id}
          jobRef={job.ref}
          raisedByRole="provider"
          onClose={() => setShowDisputeModal(false)}
          onDisputeFiled={() => {
            setStatus('disputed');
            setJob((prev) => prev ? { ...prev, jobStatus: 'disputed' } : prev);
          }}
        />
      )}

      {/* Decline Modal */}
      {showDeclineModal && job && (
        <CancelOrderModal
          jobId={job.id}
          jobRef={job.ref}
          mode="decline"
          grossAmount={job.grossAmount}
          jobStatus={job.jobStatus}
          onClose={() => setShowDeclineModal(false)}
          onConfirmed={() => {
            setStatus('cancelled');
            setJob((prev) => prev ? { ...prev, jobStatus: 'cancelled' } : prev);
          }}
        />
      )}
    </div>
  );
}

function BriefcaseIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
