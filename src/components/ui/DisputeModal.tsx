'use client';
import React, { useState, useRef } from 'react';
import { X, AlertTriangle, Loader2, Camera, Trash2, ImagePlus } from 'lucide-react';
import { disputeService } from '@/lib/services/dataService';
import { toast } from 'sonner';

const DISPUTE_REASONS = [
  'Provider did not show up',
  'Work not completed as agreed',
  'Poor quality of work',
  'Provider was unprofessional',
  'Customer was unresponsive',
  'Customer refused to pay',
  'Safety concern',
  'Fraudulent activity',
  'Other',
];

const MAX_PHOTOS = 3;

interface PhotoPreview {
  file: File;
  previewUrl: string;
}

interface DisputeModalProps {
  jobId: string;
  jobRef: string;
  raisedByRole: 'customer' | 'provider';
  onClose: () => void;
  onDisputeFiled: () => void;
}

export default function DisputeModal({
  jobId,
  jobRef,
  raisedByRole,
  onClose,
  onDisputeFiled,
}: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);

    const newPreviews: PhotoPreview[] = toAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newPreviews]);
    // Reset input so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error('Please select a reason for the dispute.');
      return;
    }
    setSubmitting(true);
    try {
      const success = await disputeService.fileDispute({
        jobId,
        raisedByRole,
        reason,
        description: description.trim() || undefined,
        evidenceFiles: photos.map((p) => p.file),
      });
      if (success) {
        toast.success('Dispute filed successfully. Our team will review it shortly.');
        // Revoke object URLs
        photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        onDisputeFiled();
        onClose();
      } else {
        toast.error('Failed to file dispute. Please try again.');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-danger" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Report an Issue</h2>
              <p className="text-xs text-muted-foreground">Job {jobRef}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Disputes are reviewed by our admin team within 24–48 hours. Please provide as much detail as possible.
            </p>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">
              Reason <span className="text-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
            >
              <option value="">Select a reason…</option>
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-foreground">
              Additional Details <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the issue in detail…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          {/* Photo Evidence */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Camera size={15} className="text-muted-foreground" />
                Photo Evidence <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div key={`photo-${idx}`} className="relative rounded-xl overflow-hidden bg-muted aspect-square">
                    <img
                      src={photo.previewUrl}
                      alt={`Evidence photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      aria-label="Remove photo"
                    >
                      <Trash2 size={11} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length < MAX_PHOTOS && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImagePlus size={16} />
                  Add Photo{photos.length === 0 ? 's' : ''} ({MAX_PHOTOS - photos.length} remaining)
                </button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Upload up to {MAX_PHOTOS} photos as evidence (JPG, PNG, WebP — max 10 MB each)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason}
              className="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-bold hover:bg-danger/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              ) : (
                'Submit Dispute'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
