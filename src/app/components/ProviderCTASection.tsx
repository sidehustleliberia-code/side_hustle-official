import React from 'react';
import Link from 'next/link';
import { ArrowRight, Wrench, BookOpen, Camera, Monitor } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


export default function ProviderCTASection() {
  return (
    <section className="py-20 lg:py-28 bg-primary">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — Final CTA content */}
          <div>
            <p className="text-secondary text-xs font-bold uppercase tracking-widest mb-4">Ready to get started?</p>
            <h2 className="text-hero-md font-extrabold text-white mb-6">
              Ready to get it done?
            </h2>

            <div className="flex flex-col gap-6 mb-8">
              <div className="flex flex-col gap-3">
                <p className="text-white/80 text-base leading-relaxed">
                  <span className="font-bold text-white">Need something done?</span> Browse service categories, submit a request, and connect with a skilled provider.
                </p>
                <Link href="/service-request-order-form" className="btn-secondary self-start font-bold">
                  Book a Service
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="w-full h-px bg-white/15" />

              <div className="flex flex-col gap-3">
                <p className="text-white/80 text-base leading-relaxed">
                  <span className="font-bold text-white">Have a skill to offer?</span> Create a provider profile, select your services, and start receiving relevant job opportunities.
                </p>
                <Link
                  href="/unified-authentication-portal"
                  className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-[10px] border-2 border-white/30 text-white font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-200"
                >
                  Become a Provider
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* Right — Service categories preview */}
          <div>
            <div className="glass-card rounded-3xl p-6">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-5">Available service categories</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: BookOpen, label: 'Education & Tutoring' },
                  { icon: Wrench, label: 'Repairs & Trades' },
                  { icon: Camera, label: 'Photography & Creative' },
                  { icon: Monitor, label: 'Technology & Digital' },
                ]?.map((item) => {
                  const Icon = item?.icon;
                  return (
                    <div key={item?.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/10 border border-white/15">
                      <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                        <Icon size={15} className="text-secondary" />
                      </div>
                      <span className="text-white text-xs font-semibold leading-tight">{item?.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-white/10 text-center">
                <p className="text-white/70 text-xs">
                  + 4 more categories including Cleaning, Errands, Personal & Lifestyle, and Events
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}