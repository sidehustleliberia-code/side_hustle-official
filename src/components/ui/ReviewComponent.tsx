'use client';
import React, { useState } from 'react';
import { Star, Send, CheckCircle, Loader2 } from 'lucide-react';
import { reviewService } from '@/lib/services/dataService';
import { toast } from 'sonner';

interface ReviewComponentProps {
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  /** 'customer' = customer reviewing provider; 'provider' = provider reviewing customer */
  reviewerRole: 'customer' | 'provider';
  onReviewSubmitted?: () => void;
}

export default function ReviewComponent({
  jobId,
  reviewerId,
  revieweeId,
  revieweeName,
  reviewerRole,
  onReviewSubmitted,
}: ReviewComponentProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const success = await reviewService.submitReview({
        jobId,
        reviewerId,
        revieweeId,
        rating,
        comment: comment.trim() || undefined,
      });
      if (success) {
        setSubmitted(true);
        toast.success('Review submitted! Thank you for your feedback.');
        onReviewSubmitted?.();
      } else {
        toast.error('Could not submit review. You may have already reviewed this job.');
      }
    } catch {
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center">
        <CheckCircle size={28} className="text-success mx-auto mb-2" />
        <p className="text-sm font-bold text-foreground">Review Submitted!</p>
        <p className="text-xs text-muted-foreground mt-1">
          You rated {revieweeName} {rating} star{rating !== 1 ? 's' : ''}.
        </p>
      </div>
    );
  }

  const prompt =
    reviewerRole === 'customer'
      ? `How was your experience with ${revieweeName}?`
      : `How was ${revieweeName} as a customer?`;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Star size={18} className="text-warning" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-foreground">Leave a Review</h2>
          <p className="text-xs text-muted-foreground">{prompt}</p>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Star Rating */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                size={28}
                className={`transition-colors ${
                  star <= (hovered || rating)
                    ? 'text-warning fill-warning' :'text-muted-foreground'
                }`}
              />
            </button>
          ))}
          {(hovered || rating) > 0 && (
            <span className="ml-2 text-sm font-semibold text-foreground">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hovered || rating]}
            </span>
          )}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={3}
          maxLength={500}
          className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={16} /> Submit Review</>
          )}
        </button>
      </div>
    </div>
  );
}
