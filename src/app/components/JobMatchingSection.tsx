import React from 'react';
import { Layers, BadgeCheck, Wifi, ArrowDown } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const matchingSteps = [
  {
    id: 'match-request',
    label: 'Customer Request',
    sub: 'Web Development',
    color: 'bg-navy-50 border-navy-100',
    textColor: 'text-primary',
    icon: '📋',
  },
  {
    id: 'match-filter',
    label: 'Eligible Providers',
    sub: 'Offering Web Development · Verified · Online',
    color: 'bg-secondary/10 border-secondary/25',
    textColor: 'text-gold-600',
    icon: '🔍',
  },
  {
    id: 'match-result',
    label: 'Job Opportunity',
    sub: 'Sent to matching providers',
    color: 'bg-success/10 border-success/20',
    textColor: 'text-success',
    icon: '✅',
  },
];

const matchCriteria = [
  { icon: Layers, label: 'Services the provider offers', desc: 'Only providers who have registered the requested service see the job' },
  { icon: BadgeCheck, label: 'Verification status', desc: 'Providers must have completed the platform verification process' },
  { icon: Wifi, label: 'Online availability', desc: 'Providers must be toggled online to receive job opportunities' },
];

export default function JobMatchingSection() {
  return (
    <section className="py-20 lg:py-28 bg-background">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — Content */}
          <div>
            <p className="section-label mb-3">Relevant Job Matching</p>
            <h2 className="text-hero-md font-extrabold text-foreground mb-5">
              Providers see jobs that match their skills.
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              Providers don't receive every job on the platform. Side Hustle is designed so that job opportunities are relevant — matched based on the services a provider has registered, their verification status, and their current availability.
            </p>

            <div className="flex flex-col gap-4">
              {matchCriteria?.map((item) => {
                const Icon = item?.icon;
                return (
                  <div key={item?.label} className="flex gap-4 items-start p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-0.5">{item?.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item?.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Visual flow */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm">
              <div className="flex flex-col gap-3">
                {matchingSteps?.map((step, i) => (
                  <React.Fragment key={step?.id}>
                    <div className={`rounded-2xl p-5 border ${step?.color}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{step?.icon}</span>
                        <div>
                          <p className={`text-sm font-bold ${step?.textColor}`}>{step?.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step?.sub}</p>
                        </div>
                      </div>
                    </div>
                    {i < matchingSteps?.length - 1 && (
                      <div className="flex justify-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-px h-4 bg-border" />
                          <ArrowDown size={14} className="text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed text-center">
                  <span className="font-semibold text-foreground">Designed for relevance.</span> Side Hustle's job matching is based on service registration, verification, and availability — not random assignment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
