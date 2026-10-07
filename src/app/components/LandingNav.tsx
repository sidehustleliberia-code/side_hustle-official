'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Menu, X, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { label: 'Services', href: '#services', key: 'nav-services' },
  { label: 'How It Works', href: '#how-it-works', key: 'nav-how-it-works' },
  { label: 'For Customers', href: '#customers', key: 'nav-customers' },
  { label: 'For Providers', href: '#providers', key: 'nav-providers' },
  { label: 'About', href: '#about', key: 'nav-about' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, loading } = useAuth();

  const isAdmin = !loading && profile?.role === 'admin';
  const isAuthenticated = !loading && !!profile;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-card shadow-nav border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 xl:px-16 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <AppLogo size={36} />
            <span className={`font-extrabold text-xl tracking-tight ${scrolled ? 'text-primary' : 'text-white'}`}>
              Side Hustle
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks?.map((link) => (
              <a
                key={link?.key}
                href={link?.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  scrolled
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {link?.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  scrolled ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white'
                }`}
                title="Admin Portal"
              >
                <Shield size={15} />
                Admin
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  href={profile?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard'}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    scrolled ? 'text-primary hover:bg-navy-50' : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/service-request-order-form"
                  className="btn-secondary text-sm px-5 py-2.5 font-bold"
                >
                  Book a Service
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/unified-authentication-portal"
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    scrolled ? 'text-primary hover:bg-navy-50' : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Log In
                </Link>
                <Link
                  href="/service-request-order-form"
                  className="btn-secondary text-sm px-5 py-2.5 font-bold"
                >
                  Book a Service
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              scrolled ? 'text-foreground hover:bg-muted' : 'text-white hover:bg-white/10'
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-card shadow-modal flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div className="flex items-center gap-2">
                <AppLogo size={32} />
                <span className="font-extrabold text-lg text-primary">Side Hustle</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-4 flex-1">
              {navLinks?.map((link) => (
                <a
                  key={link?.key}
                  href={link?.href}
                  className="text-sm font-medium text-foreground hover:text-primary hover:bg-muted py-3 px-4 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link?.label}
                </a>
              ))}
            </nav>
            <div className="p-4 border-t border-border flex flex-col gap-3">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-center gap-2 btn-outline w-full text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  <Shield size={15} />
                  Admin Portal
                </Link>
              )}
              {isAuthenticated ? (
                <>
                  <Link
                    href={profile?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard'}
                    className="btn-outline w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Dashboard
                  </Link>
                  <Link
                    href="/service-request-order-form"
                    className="btn-secondary w-full text-center font-bold"
                    onClick={() => setMobileOpen(false)}
                  >
                    Book a Service
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/unified-authentication-portal"
                    className="btn-outline w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/service-request-order-form"
                    className="btn-secondary w-full text-center font-bold"
                    onClick={() => setMobileOpen(false)}
                  >
                    Book a Service
                  </Link>
                  <Link
                    href="/unified-authentication-portal"
                    className="btn-primary w-full text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Become a Provider
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}