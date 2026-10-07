import React from 'react';

import { Layers, Users, Briefcase, Shield, Bell, FileText } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const builtForFeatures = [
  { icon: Users, label: 'Customer experience', desc: 'Booking, tracking, confirmation, reviews, and order history' },
  { icon: Briefcase, label: 'Provider experience', desc: 'Profile, service selection, job feed, completion, and earnings' },
  { icon: Shield, label: 'Administrative operations', desc: 'Job monitoring, user management, dispute handling, and payments' },
  { icon: FileText, label: 'Job management', desc: 'Full lifecycle from request through completion and closure' },
  { icon: Bell, label: 'Notifications', desc: 'Status updates throughout the job process' },
  { icon: Layers, label: 'Proof of work & confirmation', desc: 'Two-party completion with evidence and customer sign-off' },
];

const futureAreas = [
  'Business services',
  'Professional consulting',
  'Creative & digital work',
  'Delivery & logistics',
  'Skilled trades expansion',
  'Other skilled work categories',
];

export default function AboutSection() {
  return (
    <>
      {/* Built for Real Use */}
      <section id="about" className="py-20 lg:py-28 bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">

            {/* Left */}
            <div>
              <p className="section-label mb-3">Built for Real-World Use</p>
              <h2 className="text-hero-md font-extrabold text-foreground mb-5">
                Built around the complete service journey.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Side Hustle has been designed around the full service transaction — not just the booking step. The platform supports the customer experience, the provider experience, and the administrative workflow from request through completion.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {builtForFeatures?.map((feature) => {
                  const Icon = feature?.icon;
                  return (
                    <div key={feature?.label} className="flex gap-3 items-start p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground mb-0.5">{feature?.label}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{feature?.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — Why Side Hustle */}
            <div className="flex flex-col gap-5">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">For Customers</p>
                <p className="text-lg font-bold text-foreground mb-2">One place to find people who can help.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Browse categories, submit a request, track the job, and confirm completion — all in one place.</p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">For Providers</p>
                <p className="text-lg font-bold text-foreground mb-2">One place to turn skills into opportunities.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Register your services, go online, receive relevant jobs, complete the work, and track your earnings.</p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">For the Marketplace</p>
                <p className="text-lg font-bold text-foreground mb-2">One connected workflow from request to completion.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Customers, providers, and administrators work through one structured system with full visibility at every stage.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="py-20 lg:py-28 bg-muted/40">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            <div>
              <p className="section-label mb-3">More Than Services</p>
              <h2 className="text-hero-md font-extrabold text-foreground mb-5">
                Where Side Hustle is going.
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                Side Hustle starts by helping people find and provide practical services. As the platform grows, the marketplace can expand into more categories and more ways for people to turn their skills into opportunities.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The areas below represent future expansion directions — not currently available services.
              </p>
            </div>

            <div>
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Future expansion areas</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {futureAreas?.map((area) => (
                    <div key={area} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground font-medium">{area}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-xl bg-secondary/10 border border-secondary/20">
                  <p className="text-xs text-muted-foreground text-center">
                    These categories are planned future expansions and are not currently available on the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
