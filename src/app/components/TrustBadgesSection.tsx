import React from 'react';
import { Shield, Smartphone, BadgeCheck, Clock, Lock, FileCheck } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const badges = [
  {
    id: 'trust-verification',
    icon: BadgeCheck,
    title: 'Provider Verification',
    description: 'Providers go through a verification process before they can accept jobs on the platform.',
  },
  {
    id: 'trust-tracking',
    icon: Clock,
    title: 'Real-Time Tracking',
    description: 'Customers can follow their job status throughout the process from request to completion.',
  },
  {
    id: 'trust-proof',
    icon: FileCheck,
    title: 'Proof of Work',
    description: 'Providers submit evidence of completion. Customers review before confirming the job is done.',
  },
  {
    id: 'trust-confirmation',
    icon: Shield,
    title: 'Customer Confirmation',
    description: 'Jobs are not closed until the customer confirms completion or the dispute process is followed.',
  },
  {
    id: 'trust-account',
    icon: Lock,
    title: 'Secure Account Access',
    description: 'Accounts are protected with secure authentication. Transaction history is always accessible.',
  },
  {
    id: 'trust-transactions',
    icon: Smartphone,
    title: 'Transaction Tracking',
    description: 'Every transaction is recorded through the job lifecycle with full visibility for all parties.',
  },
];

export default function TrustBadgesSection() {
  return (
    <section className="py-16 lg:py-20 bg-background border-t border-border">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="section-label mb-3">What Side Hustle Provides</p>
          <h2 className="text-2xl font-extrabold text-foreground mb-3">
            Designed for accountability.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These are features that are actually implemented in the current Side Hustle platform.
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges?.map((badge) => {
            const Icon = badge?.icon;
            return (
              <div
                key={badge?.id}
                className="flex gap-4 items-start p-5 rounded-2xl bg-muted/50 border border-border hover:border-primary/20 hover:bg-navy-50 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{badge?.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{badge?.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}