import React from 'react';
import Link from 'next/link';
import { ArrowRight, UserPlus, Layers, BadgeCheck, Wifi, Briefcase, CheckCircle, TrendingUp } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const providerSteps = [
  { icon: UserPlus, label: 'Create a profile', desc: 'Register and set up your provider account' },
  { icon: Layers, label: 'Select your services', desc: 'Choose the categories and services you offer' },
  { icon: BadgeCheck, label: 'Complete verification', desc: 'Go through the platform verification process' },
  { icon: Wifi, label: 'Go online', desc: 'Toggle availability when you\'re ready to work' },
  { icon: Briefcase, label: 'Receive job opportunities', desc: 'See jobs that match your registered services' },
  { icon: CheckCircle, label: 'Complete & get paid', desc: 'Submit proof, customer confirms, earnings released' },
];

const providerFeatures = [
  'Select service categories you offer',
  'Add relevant skills to your profile',
  'See only relevant job opportunities',
  'Manage active jobs in one place',
  'Upload proof of completion',
  'Track earnings over time',
  'Build ratings and reviews',
  'Toggle availability on/off',
];

export default function ProviderSection() {
  return (
    <section id="providers" className="py-20 lg:py-28 bg-muted/40">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — Content */}
          <div>
            <p className="section-label mb-3">For Providers</p>
            <h2 className="text-hero-md font-extrabold text-foreground mb-5">
              Turn your skills into{' '}
              <span className="text-primary">opportunities.</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-4">
              If you have skills to offer, Side Hustle gives you a structured way to connect with customers who need them. Create a profile, select the services you offer, and receive relevant job opportunities.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8 italic">
              Side Hustle provides access to opportunities — not guaranteed income or guaranteed jobs. Your success depends on your skills, availability, and the quality of your work.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 mb-8">
              {providerFeatures?.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border">
                  <CheckCircle size={14} className="text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/unified-authentication-portal" className="btn-primary px-7 py-3.5">
                Become a Provider
                <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="btn-outline px-7 py-3.5">
                Learn More
              </a>
            </div>
          </div>

          {/* Right — Visual */}
          <div>
            <div className="bg-card rounded-3xl border border-border shadow-card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Provider Journey</p>
                  <p className="text-lg font-bold text-foreground">From signup to earning</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  6 steps
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {providerSteps?.map((step, i) => {
                  const Icon = step?.icon;
                  const isDone = i < 4;
                  return (
                    <div key={step?.label} className={`flex items-center gap-3 p-3 rounded-xl ${isDone ? 'bg-muted/50' : 'bg-primary/5 border border-primary/10'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-success/10' : 'bg-primary/10'}`}>
                        <Icon size={15} className={isDone ? 'text-success' : 'text-primary'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{step?.label}</p>
                        <p className="text-xs text-muted-foreground">{step?.desc}</p>
                      </div>
                      {isDone && <CheckCircle size={14} className="text-success flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Earnings note */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/10 border border-secondary/25">
                <TrendingUp size={18} className="text-gold-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">Provider earnings</p>
                  <p className="text-xs text-muted-foreground">85% of each transaction goes to the provider. Side Hustle retains a 15% platform fee.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
