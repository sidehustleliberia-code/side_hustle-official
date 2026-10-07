'use client';
import React, { useState } from 'react';
import { X, XCircle, Loader2 } from 'lucide-react';
import { jobService } from '@/lib/services/dataService';
import { toast } from 'sonner';

const CANCEL_REASONS_CUSTOMER = [
  'Changed my mind',
  'Found another provider',
  'Scheduled time no longer works',
  'Emergency / personal reason',
  'Price too high',
  'Other',
];

const DECLINE_REASONS_PROVIDER = [
  'Too far from my location',
  'Not available at scheduled time',
  'Job outside my skill set',
  'Safety concern',
  'Customer unresponsive',
  'Other',
];

interface CancelOrderModalProps {
  jobId: string;
  jobRef: string;
  mode: 'cancel' | 'decline'; // customer cancels, provider declines
  grossAmount: number;
  jobStatus: string;
  onClose: () => void;
  onConfirmed: () => void;
}

export default function CancelOrderModal({
  jobId,
  jobRef,
  mode,
  grossAmount,
  jobStatus,
  onClose,
  onConfirmed,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Customer can cancel before assignment (requested, payment_confirmed, ready_for_assignment)
  const preAssignment = ['requested', 'payment_confirmed', 'ready_for_assignment'].includes(jobStatus);
  const isEligibleForRefund = mode === 'cancel' && preAssignment;
  const reasons = mode === 'cancel' ? CANCEL_REASONS_CUSTOMER : DECLINE_REASONS_PROVIDER;

  const handleConfirm = async () => {
    if (!reason) {
      toast.error('Please select a reason.');
      return;
    }
    setSubmitting(true);
    try {
      let success = false;
      if (mode === 'cancel') {
        success = await jobService.cancelJob(jobId, reason);
      } else {
        success = await jobService.declineJob(jobId, reason);
      }

      if (success) {
        const msg = mode === 'cancel'
          ? isEligibleForRefund
            ? 'Order cancelled. A refund will be processed within 3–5 business days.' :'Order cancelled.' :'Job declined. It has been returned to the available queue.';
        toast.success(msg);
        onConfirmed();
        onClose();
      } else {
        toast.error('Action failed. Please try again.');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <XCircle size={18} className="text-danger" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                {mode === 'cancel' ? 'Cancel Order' : 'Decline Job'}
              </h2>
              <p className="text-xs text-muted-foreground">Job {jobRef}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Close">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Refund notice */}
          {isEligibleForRefund && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
              <p className="text-xs text-green-800 font-semibold">
                ✓ Refund eligible — LRD {grossAmount.toLocaleString()} will be refunded within 3–5 business days since no provider has been assigned yet.
              </p>
            </div>
          )}
          {mode === 'cancel' && !preAssignment && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <p className="text-xs text-amber-800 font-medium">
                ⚠ A provider has already been assigned. Cancellation at this stage may not be eligible for a full refund. Our team will review your case.
              </p>
            </div>
          )}
          {mode === 'decline' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <p className="text-xs text-amber-800 font-medium">
                Declining will return this job to the available queue. Please only decline if you genuinely cannot complete it.
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">
              Reason <span className="text-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Select a reason…</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              Keep Job
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !reason}
              className="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-bold hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Processing…</>
              ) : mode === 'cancel' ? 'Cancel Order' : 'Decline Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
