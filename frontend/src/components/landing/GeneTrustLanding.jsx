// Main GeneTrust landing page component

import React from 'react';
import Navigation from './Navigation.jsx';
import HeroSection from './sections/HeroSection.jsx';
import HowItWorksSection from './sections/HowItWorksSection.jsx';
import PrivacyTrustSection from './sections/PrivacyTrustSection.jsx';
import CTASection from './sections/CTASection.jsx';
import Footer from './Footer.jsx';

/**
 * GeneTrustLanding Component
 * Main landing page that combines all sections with proper web3 styling
 * Following the exact design provided with sophisticated scroll animations
 */
const GeneTrustLanding = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#0B0B1D] text-white overflow-x-hidden">
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <main className="relative">
        {/* Hero Section - Take Control of Your DNA */}
        <HeroSection />
        
        {/* How GeneTrust Works - 4 Steps */}
        <HowItWorksSection />
        
        {/* Built for Privacy, Designed for Trust */}
        <PrivacyTrustSection />
        
        {/* Ready to Take Control CTA */}
        <CTASection />
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B1D]/80 via-transparent to-[#1C1440]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14102E]/30 to-[#0B0B1D]/90" />
      </div>
    </div>
  );
};

export default GeneTrustLanding;
