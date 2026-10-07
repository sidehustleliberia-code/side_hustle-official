import React from 'react';
import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import FeaturedServicesSection from './components/FeaturedServicesSection';
import HowItWorksSection from './components/HowItWorksSection';
import CustomerSection from './components/CustomerSection';
import ProviderSection from './components/ProviderSection';
import JobMatchingSection from './components/JobMatchingSection';
import TrustSection from './components/TrustSection';
import EscrowSection from './components/EscrowSection';
import TrustBadgesSection from './components/TrustBadgesSection';
import TestimonialsSection from './components/TestimonialsSection';
import AboutSection from './components/AboutSection';
import ProviderCTASection from './components/ProviderCTASection';
import LandingFooter from './components/LandingFooter';

export default function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <FeaturedServicesSection />
      <HowItWorksSection />
      <CustomerSection />
      <ProviderSection />
      <JobMatchingSection />
      <TrustSection />
      <EscrowSection />
      <TrustBadgesSection />
      <TestimonialsSection />
      <AboutSection />
      <ProviderCTASection />
      <LandingFooter />
    </main>
  );
}