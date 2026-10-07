import React from 'react';
import Link from 'next/link';
import { Search, FileText, CreditCard, Users, CheckSquare, Hammer, Upload, ThumbsUp, Award, ArrowRight } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const steps = [
  {
    id: 'step-1',
    number: '01',
    icon: Search,
    title: 'Choose a Service',
    description: 'Browse categories and select the specific service you need.',
    phase: 'customer',
  },
  {
    id: 'step-2',
    number: '02',
    icon: FileText,
    title: 'Create Your Request',
    description: 'Describe the job, set your location, preferred date and time.',
    phase: 'customer',
  },
  {
    id: 'step-3',
    number: '03',
    icon: CreditCard,
    title: 'Payment Initiated',
    description: 'Payment is processed and funds are held through the platform\'s escrow workflow.',
    phase: 'payment',
  },
  {
    id: 'step-4',
    number: '04',
    icon: Users,
    title: 'Eligible Providers Identified',
    description: 'Providers who offer the requested service and are verified and online are notified.',
    phase: 'matching',
  },
  {
    id: 'step-5',
    number: '05',
    icon: CheckSquare,
    title: 'Provider Accepts',
    description: 'A provider accepts the job and is assigned to your request.',
    phase: 'provider',
  },
  {
    id: 'step-6',
    number: '06',
    icon: Hammer,
    title: 'Work is Completed',
    description: 'The provider carries out the service according to your request details.',
    phase: 'provider',
  },
  {
    id: 'step-7',
    number: '07',
    icon: Upload,
    title: 'Proof Submitted',
    description: 'The provider submits evidence of completion through the platform.',
    phase: 'provider',
  },
  {
    id: 'step-8',
    number: '08',
    icon: ThumbsUp,
    title: 'Customer Confirms',
    description: 'You review the proof and confirm the job is complete — or report an issue.',
    phase: 'customer',
  },
  {
    id: 'step-9',
    number: '09',
    icon: Award,
    title: 'Transaction Completed',
    description: 'The job is closed, the transaction lifecycle is recorded, and the provider\'s eligible share is released.',
    phase: 'completion',
  },
];

const phaseColors: Record<string, string> = {
  customer: 'bg-navy-50 text-primary border-navy-100',
  payment: 'bg-secondary/15 text-gold-600 border-secondary/30',
  matching: 'bg-purple-50 text-purple-600 border-purple-100',
  provider: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  completion: 'bg-success/10 text-success border-success/20',
};

const phaseIconBg: Record<string, string> = {
  customer: 'bg-primary/10',
  payment: 'bg-secondary/20',
  matching: 'bg-purple-100',
  provider: 'bg-emerald-100',
  completion: 'bg-success/15',
};

const phaseIconColor: Record<string, string> = {
  customer: 'text-primary',
  payment: 'text-gold-600',
  matching: 'text-purple-600',
  provider: 'text-emerald-600',
  completion: 'text-success',
};

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-background">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-label mb-3">The Process</p>
          <h2 className="text-hero-md font-extrabold text-foreground mb-4">
            How Side Hustle Works
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
            A structured workflow from the moment you request a service to the moment the job is confirmed complete.
          </p>
        </div>

        {/* Steps — 3-column grid on desktop */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`relative rounded-2xl p-5 border card-hover ${phaseColors[step.phase]}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${phaseIconBg[step.phase]}`}>
                    <Icon size={20} className={phaseIconColor[step.phase]} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold opacity-40 tabular-nums">{step.number}</span>
                      <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          {[
            { phase: 'customer', label: 'Customer action' },
            { phase: 'payment', label: 'Payment' },
            { phase: 'matching', label: 'Job matching' },
            { phase: 'provider', label: 'Provider action' },
            { phase: 'completion', label: 'Completion' },
          ].map((item) => (
            <div key={item.phase} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${phaseColors[item.phase]}`}>
              <span className={`w-2 h-2 rounded-full ${phaseIconBg[item.phase]}`} />
              {item.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link href="/service-request-order-form" className="btn-primary px-8 py-3.5">
            Book a Service Now
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}