import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, Users, Briefcase, Shield, Star } from 'lucide-react';

const flowSteps = [
  { label: 'Customer', sub: 'Requests a service', icon: '📋' },
  { label: 'Escrow', sub: 'Funds held securely', icon: '🔒' },
  { label: 'Provider', sub: 'Accepts & completes', icon: '⚡' },
  { label: 'Done', sub: 'Customer confirms', icon: '✅' },
];

const trustPoints = [
  'Provider verification',
  'Real-time job tracking',
  'Proof-of-work submission',
  'Customer confirmation',
];

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col relative overflow-hidden pt-16">

      {/* ── Split background ── */}
      {/* Left blue panel */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-[52%] z-0"
        style={{ background: 'linear-gradient(150deg, #273B8C 0%, #1e2f72 55%, #162259 100%)' }}
      />
      {/* Right image panel */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[52%] z-0">
        <Image
          src="/assets/images/hero_hands_exchange.png"
          alt="Two Black hands from opposite ends exchanging services and cash, symbolizing the Side Hustle marketplace"
          fill
          quality={100}
          sizes="52vw"
          className="object-cover object-center"
          priority
        />
        {/* Blue-tinted overlay so image blends with brand */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #273B8C 0%, rgba(39,59,140,0.55) 40%, rgba(39,59,140,0.2) 100%)' }} />
      </div>

      {/* Decorative blue glow orb */}
      <div className="absolute top-1/3 left-[30%] w-[500px] h-[500px] rounded-full pointer-events-none z-0 opacity-20"
        style={{ background: 'radial-gradient(circle, #4a6fd4 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      {/* Subtle grid texture on blue side */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-[52%] z-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)' }}
      />

      {/* ── Content ── */}
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16 w-full py-20 lg:py-28 relative z-10 flex-1 flex items-center">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center w-full">

          {/* Left — Copy */}
          <div className="flex flex-col gap-8">

            {/* Pill label */}
            <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border"
              style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)' }}
            >
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-white/90 text-sm font-semibold tracking-wide">
                A marketplace for skills &amp; services
              </span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-5">
              <h1 className="text-hero-xl font-extrabold text-white leading-tight">
                Get Things Done.{' '}
                <br />
                <span className="relative inline-block">
                  <span className="text-secondary">Create Opportunities.</span>
                  {/* Underline accent */}
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-secondary/40" />
                </span>
              </h1>
              <p className="text-lg lg:text-xl leading-relaxed max-w-lg" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Side Hustle connects customers with skilled service providers — making it easier to find help, request services, and turn your skills into real income.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/service-request-order-form"
                className="btn-secondary text-base px-7 py-3.5 font-bold shadow-btn-secondary"
              >
                Book a Service
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/unified-authentication-portal"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-base transition-all duration-200 text-white hover:bg-white/10"
                style={{ border: '2px solid rgba(255,255,255,0.28)' }}
              >
                Become a Provider
              </Link>
            </div>

            {/* Trust points */}
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
              {trustPoints?.map((point) => (
                <div key={point} className="flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-secondary flex-shrink-0" />
                  <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>{point}</span>
                </div>
              ))}
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {['#4a6fd4', '#273B8C', '#1e2f72', '#162259']?.map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: c }}>
                    {['A', 'K', 'M', 'J']?.[i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)]?.map((_, i) => <Star key={i} size={12} className="text-secondary fill-secondary" />)}
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Trusted by 2,000+ users in Liberia</p>
              </div>
            </div>
          </div>

          {/* Right — Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm lg:max-w-md">

              {/* Main card */}
              <div className="rounded-3xl p-7 w-full relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' }}
              >
                {/* Card inner blue accent top-right */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30"
                  style={{ background: 'radial-gradient(circle, #4a6fd4, transparent 70%)' }}
                />

                <div className="mb-6 relative">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>How Side Hustle Works</p>
                  <p className="text-white font-bold text-lg">From request to completion</p>
                </div>

                {/* Flow steps */}
                <div className="flex flex-col gap-0 mb-6 relative">
                  {flowSteps?.map((step, i) => (
                    <div key={step?.label} className="flex items-start gap-3 relative">
                      {/* Connector line */}
                      {i < flowSteps?.length - 1 && (
                        <div className="absolute left-[15px] top-8 w-px h-6 z-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
                      )}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 z-10 mt-0.5"
                        style={{ background: i === flowSteps?.length - 1 ? 'rgba(22,163,74,0.3)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        {step?.icon}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-white font-semibold text-sm">{step?.label}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{step?.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Escrow highlight */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl"
                  style={{ background: 'rgba(39,59,140,0.4)', border: '1px solid rgba(74,111,212,0.4)' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(74,111,212,0.3)' }}
                  >
                    <Shield size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Escrow-Based Payments</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Payment held until customer confirms completion</p>
                  </div>
                </div>
              </div>

              {/* Floating badge — customer */}
              <div className="absolute -top-5 -left-4 bg-card rounded-2xl shadow-card-hover px-4 py-2.5 flex items-center gap-2.5 border border-border">
                <div className="w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Find a Service</p>
                  <p className="text-xs text-muted-foreground">8 categories available</p>
                </div>
              </div>

              {/* Floating badge — provider */}
              <div className="absolute -bottom-5 -right-4 bg-card rounded-2xl shadow-card-hover px-4 py-2.5 flex items-center gap-2.5 border border-border">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={14} className="text-success" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Offer Your Skills</p>
                  <p className="text-xs text-muted-foreground">Become a provider</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-background z-20" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
    </section>
  );
}