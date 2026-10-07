import React from 'react';
import { ArrowDown, CreditCard, Shield, Hammer, Upload, ThumbsUp, CheckCircle, DollarSign } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const escrowFlow = [
  { id: 'ef-pay', label: 'Customer Pays', detail: '100% of service amount', icon: CreditCard, color: 'bg-navy-50 border-navy-100', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { id: 'ef-hold', label: 'Funds Held', detail: 'Side Hustle holds payment during the job', icon: Shield, color: 'bg-secondary/10 border-secondary/25', iconBg: 'bg-secondary/20', iconColor: 'text-gold-600' },
  { id: 'ef-work', label: 'Provider Works', detail: 'Service is carried out', icon: Hammer, color: 'bg-muted border-border', iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
  { id: 'ef-proof', label: 'Proof Submitted', detail: 'Provider uploads evidence of completion', icon: Upload, color: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 'ef-confirm', label: 'Customer Confirms', detail: 'Customer reviews and confirms completion', icon: ThumbsUp, color: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { id: 'ef-release', label: 'Transaction Completed', detail: 'Provider share released, platform fee retained', icon: CheckCircle, color: 'bg-success/10 border-success/20', iconBg: 'bg-success/15', iconColor: 'text-success' },
];

export default function EscrowSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/40">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label mb-3">Escrow & Payments</p>
          <h2 className="text-hero-md font-extrabold text-foreground mb-4">
            Payment follows the job.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Side Hustle's transaction workflow is designed so that payment is coordinated with the job lifecycle — not released simply because a booking was created. Funds are held during the service process and released after the job is confirmed complete.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left — Escrow flow */}
          <div>
            <div className="flex flex-col gap-3">
              {escrowFlow?.map((step, i) => {
                const Icon = step?.icon;
                return (
                  <React.Fragment key={step?.id}>
                    <div className={`rounded-2xl p-4 border ${step?.color}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step?.iconBg}`}>
                          <Icon size={18} className={step?.iconColor} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{step?.label}</p>
                          <p className="text-xs text-muted-foreground">{step?.detail}</p>
                        </div>
                      </div>
                    </div>
                    {i < escrowFlow?.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown size={14} className="text-muted-foreground/50" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right — Fee breakdown + messaging */}
          <div className="flex flex-col gap-6">

            {/* Fee breakdown */}
            <div className="bg-card rounded-2xl border border-border shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <DollarSign size={18} className="text-primary" />
                <p className="text-base font-bold text-foreground">Transaction Breakdown</p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between py-2.5 border-b border-border">
                  <span className="text-sm text-muted-foreground font-medium">Customer payment</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">1,700 LD</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-border">
                  <div>
                    <span className="text-sm text-muted-foreground font-medium">Side Hustle platform fee</span>
                    <span className="text-xs text-muted-foreground ml-1.5">(15%)</span>
                  </div>
                  <span className="text-sm font-bold text-warning tabular-nums">255 LD</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-bold text-foreground">Provider share</span>
                  <span className="text-sm font-bold text-success tabular-nums">1,445 LD</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground leading-relaxed">
                The 1,700 LD is the gross transaction amount. 255 LD is the Side Hustle platform fee. 1,445 LD is the provider's eligible share, released after customer confirmation.
              </div>
            </div>

            {/* Customer trust message */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm font-bold text-foreground mb-2">For customers</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your payment stays connected to the service process. Side Hustle's transaction workflow is designed to coordinate payment, job completion, proof of work, and customer confirmation before funds are released.
              </p>
            </div>

            {/* Provider trust message */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-sm font-bold text-foreground mb-2">For providers</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Complete the work. Submit proof. Your eligible earnings are released through the platform's transaction process after the customer confirms completion.
              </p>
            </div>

            {/* Payment integration status */}
            <div className="bg-secondary/10 rounded-2xl border border-secondary/25 p-5">
              <p className="text-sm font-bold text-foreground mb-2">Payment integration</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Side Hustle is designed around an escrow-based payment workflow and is being prepared for mobile-money integration, including Orange Money and MTN Mobile Money.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
