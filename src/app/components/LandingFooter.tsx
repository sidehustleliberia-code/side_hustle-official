import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Mail, MapPin } from 'lucide-react';

const footerLinks = {
  explore: [
    { label: 'Services', href: '#services', key: 'footer-services' },
    { label: 'How It Works', href: '#how-it-works', key: 'footer-how' },
    { label: 'For Customers', href: '#customers', key: 'footer-customers' },
    { label: 'For Providers', href: '#providers', key: 'footer-providers' },
  ],
  providers: [
    { label: 'Become a Provider', href: '/unified-authentication-portal', key: 'footer-become-provider' },
    { label: 'Provider Dashboard', href: '/provider-dashboard', key: 'footer-provider-dash' },
  ],
  support: [
    { label: 'Help & Support', href: '/help-support', key: 'footer-help' },
    { label: 'Contact', href: '/help-support', key: 'footer-contact' },
  ],
  account: [
    { label: 'Log In', href: '/unified-authentication-portal', key: 'footer-login' },
    { label: 'Register', href: '/unified-authentication-portal', key: 'footer-register' },
    { label: 'Book a Service', href: '/service-request-order-form', key: 'footer-book' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#', key: 'footer-privacy' },
    { label: 'Terms of Service', href: '#', key: 'footer-terms' },
  ],
};

export default function LandingFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16 pt-16 pb-8">

        {/* Top */}
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">

          {/* Brand — spans 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <AppLogo size={36} />
              <span className="font-extrabold text-xl text-white">Side Hustle</span>
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              A platform connecting people who need things done with people who have the skills to do them.
            </p>
            <div className="flex flex-col gap-2 text-sm text-white/65">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-secondary flex-shrink-0" />
                <span>Monrovia, Liberia</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-secondary flex-shrink-0" />
                <span>support@sidehustle.lr</span>
              </div>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Explore</h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks?.explore?.map((link) => (
                <li key={link?.key}>
                  <a href={link?.href} className="text-sm text-white/65 hover:text-secondary transition-colors duration-150">
                    {link?.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">For Providers</h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks?.providers?.map((link) => (
                <li key={link?.key}>
                  <Link href={link?.href} className="text-sm text-white/65 hover:text-secondary transition-colors duration-150">
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Support</h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks?.support?.map((link) => (
                <li key={link?.key}>
                  <Link href={link?.href} className="text-sm text-white/65 hover:text-secondary transition-colors duration-150">
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 mt-6">Account</h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks?.account?.map((link) => (
                <li key={link?.key}>
                  <Link href={link?.href} className="text-sm text-white/65 hover:text-secondary transition-colors duration-150">
                    {link?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks?.legal?.map((link) => (
                <li key={link?.key}>
                  <a href={link?.href} className="text-sm text-white/65 hover:text-secondary transition-colors duration-150">
                    {link?.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment note */}
        <div className="flex flex-wrap gap-3 mb-8 py-6 border-t border-white/15">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <span className="text-secondary text-sm">🔒</span>
            <span className="text-sm font-semibold text-white">Escrow-Based Payments</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <span className="text-secondary text-sm">✓</span>
            <span className="text-sm font-semibold text-white">Provider Verification</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <span className="text-secondary text-sm">📋</span>
            <span className="text-sm font-semibold text-white">Proof of Work</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            <span className="text-secondary text-sm">📱</span>
            <span className="text-sm font-semibold text-white">Mobile Money Integration (Planned)</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/15">
          <p className="text-xs text-white/50">
            © 2026 Side Hustle. All rights reserved.
          </p>
          <p className="text-xs text-white/40">
            A marketplace for skills and services.
          </p>
        </div>
      </div>
    </footer>
  );
}