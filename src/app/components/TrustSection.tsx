import React from 'react';
import { Shield, Eye, Upload, ThumbsUp, AlertCircle, ArrowDown, CheckCircle, BadgeCheck } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const completionFlow = [
  {
    id: 'cf-provider',
    actor: 'Provider',
    action: 'Job Completed',
    detail: 'Provider marks the job as complete',
    icon: CheckCircle,
    color: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'cf-proof',
    actor: 'Proof of Work',
    action: 'Evidence Submitted',
    detail: 'Provider uploads evidence through the platform',
    icon: Upload,
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'cf-customer',
    actor: 'Customer',
    action: 'Reviews & Confirms',
    detail: 'Customer reviews the submitted evidence',
    icon: Eye,
    color: 'bg-navy-50 border-navy-100',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 'cf-complete',
    actor: 'Completed',
    action: 'Transaction Finalized',
    detail: 'Job closed, provider share released',
    icon: Shield,
    color: 'bg-success/10 border-success/20',
    iconBg: 'bg-success/15',
    iconColor: 'text-success',
  },
];

const trustFeatures = [
  { icon: Eye, label: 'Real-time job tracking', desc: 'Customers can follow the job status throughout the process' },
  { icon: BadgeCheck, label: 'Provider verification', desc: 'Providers go through a verification process before accepting jobs' },
  { icon: Upload, label: 'Proof-of-work', desc: 'Providers submit evidence of completion before the job is closed' },
  { icon: ThumbsUp, label: 'Customer confirmation', desc: 'The customer must confirm completion — not just the provider' },
  { icon: AlertCircle, label: 'Dispute handling', desc: 'Customers can report an issue if there is a problem with the service' },
  { icon: Shield, label: 'Transaction tracking', desc: 'The full transaction lifecycle is recorded on the platform' },
];

export default function TrustSection() {
  return (
    <section className="py-20 lg:py-28 bg-primary">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-3">
            Trust & Transparency
          </p>
          <h2 className="text-hero-md font-extrabold text-white mb-4">
            Everyone stays on the same page.
          </h2>
          <p className="text-base text-white/70 leading-relaxed">
            Side Hustle is designed to keep customers, providers, and administrators informed throughout the job lifecycle — with accountability built into every step.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* Left — Two-way completion flow */}
          <div>
            <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-5">
              Two-Way Completion
            </p>
            <div className="flex flex-col gap-3">
              {completionFlow?.map((step, i) => {
                const Icon = step?.icon;
                return (
                  <React.Fragment key={step?.id}>
                    <div className={`rounded-2xl p-4 border ${step?.color}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step?.iconBg}`}>
                          <Icon size={18} className={step?.iconColor} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{step?.actor}</p>
                          <p className="text-sm font-bold text-foreground">{step?.action}</p>
                          <p className="text-xs text-muted-foreground">{step?.detail}</p>
                        </div>
                      </div>
                    </div>
                    {i < completionFlow?.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown size={16} className="text-white/30" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="mt-5 p-4 rounded-2xl bg-white/10 border border-white/15">
              <p className="text-sm text-white/80 leading-relaxed">
                <span className="font-bold text-white">Important:</span> A provider can submit a job as complete, but the customer still has the opportunity to review the submitted evidence and confirm completion. If there is an issue, the customer can report it.
              </p>
            </div>
          </div>

          {/* Right — Trust features */}
          <div>
            <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-5">
              Platform Accountability
            </p>
            <div className="grid gap-4">
              {trustFeatures?.map((feature) => {
                const Icon = feature?.icon;
                return (
                  <div key={feature?.label} className="flex gap-4 items-start p-4 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{feature?.label}</p>
                      <p className="text-xs text-white/60 leading-relaxed">{feature?.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
