'use client';
import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import type { OrderFormData } from './ServiceRequestPage';

interface Props {
  formData: OrderFormData;
  onProceedToPayment: () => void;
  compact?: boolean;
}

export default function PricingSummaryPanel({ formData, onProceedToPayment, compact }: Props) {
  const { category, service, quantity, date, time, area } = formData;

  // Use service pricing when available, otherwise fall back to category pricing
  const activePricing = service || category;
  const baseTotal = activePricing ? activePricing.basePrice * quantity : 0;
  const platformFee = activePricing ? activePricing.platformFee * quantity : 0;
  const grandTotal = baseTotal + platformFee;
  const displayLabel = service ? service.name : category?.label || '';

  const isReady =
    !!category &&
    !!service &&
    formData.address.trim().length > 0 &&
    formData.area.length > 0 &&
    formData.date.length > 0 &&
    formData.time.length > 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          {activePricing ? (
            <>
              <p className="text-xs text-muted-foreground font-medium">Total to Pay</p>
              <p className="text-xl font-extrabold text-primary tabular-nums">
                LRD {grandTotal.toLocaleString('en-US')}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a service to see pricing</p>
          )}
        </div>
        <button
          type="button"
          onClick={onProceedToPayment}
          disabled={!isReady}
          className="btn-secondary px-6 py-3 text-sm font-bold flex-shrink-0"
        >
          Pay Now
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-navy-50">
        <h3 className="text-base font-bold text-foreground">Order Summary</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Review before payment</p>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Service details */}
        {activePricing ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-sm font-bold">{quantity}×</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{displayLabel}</p>
                {service && category && (
                  <p className="text-xs text-muted-foreground truncate">{category.label}</p>
                )}
                <p className="text-xs text-muted-foreground">{activePricing.unit}</p>
              </div>
              <p className="text-sm font-bold text-foreground tabular-nums flex-shrink-0">
                LRD {baseTotal.toLocaleString('en-US')}
              </p>
            </div>

            {/* Location / schedule summary */}
            {(area || date || time) && (
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {area && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary">📍</span>
                    <span>{area}{formData.address ? `, ${formData.address}` : ''}</span>
                  </div>
                )}
                {date && time && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-primary">📅</span>
                    <span>{date} at {time}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ShieldCheck size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">No service selected</p>
            <p className="text-xs text-muted-foreground">Choose a category and service above</p>
          </div>
        )}

        {/* Pricing breakdown */}
        {activePricing && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="pricing-row px-4">
              <span className="text-sm text-muted-foreground">
                {displayLabel} × {quantity}
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                LRD {baseTotal.toLocaleString('en-US')}
              </span>
            </div>
            <div className="pricing-row px-4">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">Platform Fee</span>
                <div className="relative group">
                  <Info size={13} className="text-muted-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-foreground text-background text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
                    This small fee covers platform operations, escrow management, and provider verification.
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                LRD {platformFee.toLocaleString('en-US')}
              </span>
            </div>
            <div className="px-4 py-3 bg-navy-50 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span className="text-lg font-extrabold text-primary tabular-nums">
                LRD {grandTotal.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        )}

        {/* Escrow notice */}
        {activePricing && (
          <div className="flex items-start gap-2.5 p-3 bg-gold-50 border border-gold-100 rounded-xl">
            <ShieldCheck size={16} className="text-gold-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gold-600 leading-relaxed font-medium">
              Your payment is held securely in escrow and only released to the provider after job completion is confirmed.
            </p>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={onProceedToPayment}
          disabled={!isReady}
          className="btn-secondary w-full py-3.5 text-base font-bold"
        >
          {!category
            ? 'Select a Category First'
            : !service
            ? 'Select a Service'
            : !isReady
            ? 'Complete All Fields'
            : `Pay LRD ${grandTotal.toLocaleString('en-US')} Now`}
        </button>

        {!isReady && activePricing && (
          <p className="text-xs text-center text-muted-foreground -mt-2">
            {!service ? 'Please select a specific service' : 'Please fill in location, date, and time to continue'}
          </p>
        )}

        {/* Accepted payments */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <span className="text-xs text-muted-foreground font-medium">Accepted:</span>
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            Orange Money
          </span>
          <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
            MTN Mobile Money
          </span>
        </div>
      </div>
    </div>
  );
}