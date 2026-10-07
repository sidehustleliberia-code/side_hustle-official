import React from 'react';
import Link from 'next/link';
import { ArrowRight, Search, FileText, Calendar, CreditCard, Eye, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const customerSteps = [
  { icon: Search, label: 'Browse categories', desc: 'Find the service you need from 8 categories' },
  { icon: FileText, label: 'Submit a request', desc: 'Describe the job with location and details' },
  { icon: Calendar, label: 'Set date & time', desc: 'Choose your preferred schedule' },
  { icon: CreditCard, label: 'Initiate payment', desc: 'Payment held securely during the job' },
  { icon: Eye, label: 'Track your order', desc: 'Follow the job status in real time' },
  { icon: CheckCircle, label: 'Confirm completion', desc: 'Review proof and confirm the job is done' },
];

const customerFeatures = [
  'View assigned provider details',
  'Receive status updates',
  'Review proof of work',
  'Report an issue if needed',
  'Leave a review after completion',
  'Access order history and receipts',
];

export default function CustomerSection() {
  return (
    <section id="customers" className="py-20 lg:py-28 bg-background">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — Visual */}
          <div className="order-2 lg:order-1">
            <div className="bg-card rounded-3xl border border-border shadow-card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Customer Journey</p>
                  <p className="text-lg font-bold text-foreground">From request to done</p>
                </div>
                <span className="badge-primary text-xs">6 steps</span>
              </div>

              <div className="space-y-3">
                {customerSteps?.map((step, i) => {
                  const Icon = step?.icon;
                  const isActive = i === 3;
                  return (
                    <div
                      key={step?.label}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-white/20' : 'bg-card'
                      }`}>
                        <Icon size={15} className={isActive ? 'text-white' : 'text-primary'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-foreground'}`}>{step?.label}</p>
                        <p className={`text-xs ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>{step?.desc}</p>
                      </div>
                      {i < 3 && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-white/20' : 'bg-success/10'
                        }`}>
                          <CheckCircle size={12} className={isActive ? 'text-white/60' : 'text-success'} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div className="order-1 lg:order-2">
            <p className="section-label mb-3">For Customers</p>
            <h2 className="text-hero-md font-extrabold text-foreground mb-5">
              Need something done?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-8">
              Side Hustle makes it straightforward to find skilled people for the things you need done. Browse categories, submit your request, and follow the job from start to finish.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 mb-8">
              {customerFeatures?.map((feature) => (
                <div key={feature} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
                  <CheckCircle size={14} className="text-success flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <Link href="/service-request-order-form" className="btn-primary px-7 py-3.5">
              Book a Service
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
