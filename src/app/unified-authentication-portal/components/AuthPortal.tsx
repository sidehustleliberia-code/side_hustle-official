'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

type AuthView = 'login' | 'register' | 'forgot';
type UserRole = 'customer' | 'provider';

export default function AuthPortal() {
  const [view, setView] = useState<AuthView>('login');
  const [role, setRole] = useState<UserRole>('customer');

  return (
    <div className="min-h-screen flex" suppressHydrationWarning>
      {/* Left Brand Panel — Desktop Only */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] gradient-hero flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10 bg-secondary blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-80 h-80 rounded-full opacity-5 bg-white blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <AppLogo size={40} />
          <span className="font-extrabold text-2xl text-white">SideHustle</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-5">
            Connect.{' '}
            <span className="text-secondary">Earn.</span>{' '}
            Grow.
          </h1>
          <p className="text-base xl:text-lg text-white/70 leading-relaxed mb-8">
            Liberia&apos;s trusted marketplace connecting customers with skilled local service providers. Pay securely via mobile money.
          </p>

          {/* Feature list */}
          <div className="flex flex-col gap-3">
            {[
              '🔒 Escrow-protected payments via Orange Money & MTN',
              '✓ Verified local service providers',
              '⚡ Jobs assigned within 30 minutes',
              '💰 Providers paid directly to mobile money',
            ].map((item) => (
              <div key={`brand-feature-${item.slice(0, 20)}`} className="flex items-start gap-2">
                <span className="text-sm text-white/80 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom testimonial */}
        <div className="relative z-10 glass-card rounded-2xl p-5">
          <p className="text-sm text-white/80 leading-relaxed mb-3 italic">
            &ldquo;I made LRD 12,000 last month just from laundry jobs. SideHustle changed my life.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm">
              ED
            </div>
            <div>
              <p className="text-sm font-bold text-white">Emmanuel Dolo</p>
              <p className="text-xs text-white/60">Laundry Provider · Sinkor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 xl:p-14 bg-background overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8 self-start">
          <AppLogo size={32} />
          <span className="font-extrabold text-xl text-primary">SideHustle</span>
        </div>

        <div className="w-full max-w-md">
          {view === 'login' && (
            <LoginForm
              role={role}
              onRoleChange={setRole}
              onForgotPassword={() => setView('forgot')}
              onGoRegister={() => setView('register')}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              role={role}
              onRoleChange={setRole}
              onGoLogin={() => setView('login')}
            />
          )}
          {view === 'forgot' && (
            <ForgotPasswordForm onGoLogin={() => setView('login')} />
          )}
        </div>

        {/* Back to landing */}
        <div className="mt-8">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to SideHustle.lr
          </Link>
        </div>
      </div>
    </div>
  );
}