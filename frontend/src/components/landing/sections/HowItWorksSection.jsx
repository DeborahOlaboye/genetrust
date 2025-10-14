// How GeneTrust Works section with 4-step process

import React from 'react';

/**
 * HowItWorksSection Component
 * Displays the 4-step process of how GeneTrust works
 * Upload & Encrypt → Lab Verification → Set Permissions → Earn Tokens
 */
const HowItWorksSection = () => {
  const steps = [
    {
      number: '1',
      title: 'Create Your Vault',
      description: 'Import raw genetic files into your private GeneTrust Vault with end‑to‑end encryption.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      color: '#8B5CF6',
      bgColor: '#8B5CF6'
    },
    {
      number: '2',
      title: 'Verify Provenance',
      description: 'Connect to accredited labs for cryptographic attestations of authenticity.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: '#F472B6',
      bgColor: '#F472B6'
    },
    {
      number: '3',
      title: 'Set Consent Rules',
      description: 'Define granular access policies, durations, and permitted research domains.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: '#F59E0B',
      bgColor: '#F59E0B'
    },
    {
      number: '4',
      title: 'License & Earn',
      description: 'Approve requests, stream usage receipts on‑chain, and receive instant rewards.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: '#DB2777',
      bgColor: '#DB2777'
    }
  ];

  return (
    <section id="how-it-works" className="relative py-20 bg-gradient-to-b from-[#0B0B1D] to-[#14102E]">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B1D]/90 via-transparent to-[#1C1440]/90" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            How GeneTrust Works
          </h2>
          <p className="text-xl text-[#D6D7FF] max-w-3xl mx-auto leading-relaxed">
            Four streamlined steps from private storage to transparent impact
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative group">
              {/* Connection Line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#8B5CF6]/50 to-[#F472B6]/30 transform translate-x-4 z-0" />
              )}

              {/* Step Card */}
              <div className="relative bg-gradient-to-br from-[#14102E]/60 to-[#0B0B1D]/60 backdrop-blur-sm border border-[#8B5CF6]/15 rounded-xl p-6 hover:border-[#8B5CF6]/35 transition-all duration-300 group-hover:transform group-hover:scale-105 z-10">
                {/* Step Number Circle */}
                <div className="relative mb-6">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto relative"
                    style={{ backgroundColor: `${step.bgColor}20` }}
                  >
                    <div 
                      className="absolute inset-0 rounded-full animate-pulse"
                      style={{ backgroundColor: `${step.color}10` }}
                    />
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
                      style={{ backgroundColor: step.color }}
                    >
                      <span className="text-white font-bold text-lg">{step.number}</span>
                    </div>
                  </div>
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: `${step.color}15`,
                      color: step.color 
                    }}
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[#D6D7FF] text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Hover Effects */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ 
                    background: `linear-gradient(135deg, ${step.color}0A, transparent)`,
                    boxShadow: `0 10px 40px ${step.color}20`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Process Flow Visualization (Mobile) */}
        <div className="lg:hidden mt-12 flex flex-col items-center space-y-4">
          {steps.slice(0, -1).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="w-0.5 h-8 bg-gradient-to-b from-[#2DD4BF] to-[#5594E0]" />
              <svg className="w-4 h-4 text-[#2DD4BF]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-4 px-6 py-3 bg-[#121F40]/60 backdrop-blur-sm border border-[#2DD4BF]/20 rounded-full">
            <div className="w-3 h-3 bg-[#37A36B] rounded-full animate-pulse" />
            <span className="text-[#C9E1FF] text-sm">
              Join thousands already earning from their genetic data
            </span>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-1/12 w-2 h-2 bg-[#2DD4BF]/40 rounded-full animate-pulse" />
      <div className="absolute bottom-1/3 right-1/12 w-1 h-1 bg-[#5594E0]/60 rounded-full animate-ping" />
      <div className="absolute top-3/4 left-1/6 w-3 h-3 bg-[#20A7BD]/30 rounded-full animate-pulse delay-500" />
    </section>
  );
};

export default HowItWorksSection;
