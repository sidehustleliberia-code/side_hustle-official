import React from 'react';
import { Shield, Users, Layers, Eye } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const credibilityPoints = [
  {
    id: 'cred-1',
    icon: Users,
    title: 'Relevant Connections',
    description: 'Providers see opportunities related to the services they have registered — not every job on the platform.',
  },
  {
    id: 'cred-2',
    icon: Eye,
    title: 'Transparent Progress',
    description: 'Customers can follow their job throughout the process with real-time status visibility.',
  },
  {
    id: 'cred-3',
    icon: Shield,
    title: 'Proof & Confirmation',
    description: 'Completion includes provider evidence and customer confirmation — a two-party process.',
  },
  {
    id: 'cred-4',
    icon: Layers,
    title: 'Structured Marketplace',
    description: 'Customers, providers, and administrators work through one connected system from request to completion.',
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-muted/40">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="section-label mb-3">Why Side Hustle</p>
          <h2 className="text-hero-md font-extrabold text-foreground mb-4">
            Built around real-world needs.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Side Hustle is designed to provide structure and accountability around the entire service transaction — from discovery through completion.
          </p>
        </div>

        {/* Value cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {credibilityPoints?.map((point) => {
            const Icon = point?.icon;
            return (
              <div
                key={point?.id}
                className="bg-card rounded-2xl border border-border p-6 shadow-card card-hover flex flex-col gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">{point?.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point?.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Honest note */}
        <div className="mt-10 text-center">
          <div className="inline-block px-6 py-4 rounded-2xl bg-card border border-border shadow-card max-w-2xl">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Genuine testimonials will be added here</span> once real customers and providers have used Side Hustle and provided their feedback. We don't create fictional reviews.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}