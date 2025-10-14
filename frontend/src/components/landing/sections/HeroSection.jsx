// Hero section with DNA animation and Genomic Vault interface

import React from 'react';
import BackgroundGenomeField from '../BackgroundGenomeField.jsx';

/**
 * HeroSection Component
 * Main hero section with "Take Control of Your DNA" messaging
 * Includes Genomic Vault interface mockup and DNA helix animation
 */
const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0B1D] via-[#14102E] to-[#1C1440]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      <BackgroundGenomeField opacity={0.22} ribbons={3} nucleotides={80} speed={0.35} />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8 z-10">

          {/* Main Headlines */}
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-white">Own Your Genome.</span>
              <br />
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] bg-clip-text text-transparent">License Your Impact.</span>
            </h1>

            <p className="text-xl text-[#D6D7FF] leading-relaxed max-w-lg">
              Vault your DNA with military‑grade privacy. Approve research requests with one tap. Earn transparently when your data advances science.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex items-center space-x-6">
            <button className="group px-8 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#8B5CF6]/25 transform hover:scale-105 transition-all duration-300">
              <span className="flex items-center space-x-2">
                <span>Create Your Vault</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <button className="px-6 py-3 text-[#F59E0B] border border-[#F59E0B]/30 rounded-lg hover:bg-[#F59E0B]/5 transition-all duration-300">
              See How It Works
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center space-x-8 pt-8">

            <div className="text-center">
              <div className="text-2xl font-bold text-[#F472B6]">Zero‑Knowledge</div>
              <div className="text-sm text-[#9AA0B2]">Access Controls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F59E0B]">On‑Chain</div>
              <div className="text-sm text-[#9AA0B2]">Audit & Rewards</div>
            </div>
          </div>
        </div>

        {/* Right Content - Genomic Vault Interface (DNA animation removed per request) */}
        <div className="relative lg:h-[600px] flex items-center justify-center">
          {/* Research Deal Console Overlay */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-80 max-w-sm">
            <div className="bg-[#0B0B1D]/80 backdrop-blur-xl border border-[#8B5CF6]/20 rounded-xl p-6 shadow-2xl">
              {/* Console Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Research Deal Console</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                  <span className="text-xs text-[#F59E0B]">1 pending</span>
                </div>
              </div>

              {/* Deal Summary */}
              <div className="space-y-4">
                <div className="p-3 bg-[#14102E]/60 rounded-lg border border-[#8B5CF6]/20">
                  <div className="text-xs text-[#9AA0B2] mb-1">Research Call</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Oncology Cohort • WGS</span>
                    <span className="text-xs bg-[#8B5CF6]/20 text-[#C7B7FF] px-2 py-1 rounded">Phase II</span>
                  </div>
                </div>

                <div className="p-3 bg-[#14102E]/60 rounded-lg border border-[#F472B6]/20">
                  <div className="text-xs text-[#9AA0B2] mb-1">Consent Scope</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">De‑identified traits • 6 months</span>
                    <span className="text-xs bg-[#F472B6]/20 text-[#F8C5DE] px-2 py-1 rounded">No re‑contact</span>
                  </div>
                </div>

                <div className="p-3 bg-[#14102E]/60 rounded-lg border border-[#F59E0B]/20">
                  <div className="text-xs text-[#9AA0B2] mb-1">Reward Offer</div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Fixed + usage‑based</span>
                    <span className="text-xs text-[#F59E0B] font-semibold">1,500 GMC</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="px-3 py-2 bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs rounded-lg border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/20 transition-colors">
                  Review Terms
                </button>
                <button className="px-3 py-2 bg-[#F59E0B]/10 text-[#F59E0B] text-xs rounded-lg border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 transition-colors">
                  Approve Access
                </button>
              </div>
            </div>
          </div>

          {/* Glow Effects */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-[#F472B6]/10 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
