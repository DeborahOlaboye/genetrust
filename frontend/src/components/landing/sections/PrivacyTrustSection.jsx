// Built for Privacy, Designed for Trust section

import React, { useEffect, useState } from 'react';
import BackgroundDNAIcons from '../BackgroundDNAIcons.jsx';
import BackgroundGenomeField from '../BackgroundGenomeField.jsx';

/**
 * PrivacyTrustSection Component
 * Shows privacy features, security dashboard, and DNA animation
 * Includes End-to-End Encryption, Medical Lab Verification, Smart Contract Automation
 */
const PrivacyTrustSection = () => {
  const privacyFeatures = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Zero‑Knowledge Proofs',
      description: 'Access control enforced with ZK proofs—no raw data exposure.',
      color: '#8B5CF6'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
        </svg>
      ),
      title: 'Audit Trail',
      description: 'Every access event is recorded on‑chain for full transparency.',
      color: '#F472B6'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      ),
      title: 'SOC 2 Type II',
      description: 'Independent controls attested for security and availability.',
      color: '#F59E0B'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3zm0 2c-2.5 0-7 1.25-7 3.75V19h14v-2.25C19 14.25 14.5 13 12 13z" />
        </svg>
      ),
      title: 'Pseudonymization',
      description: 'Research matching with identifiers stripped and rotated.',
      color: '#DB2777'
    }
  ];

  const securityStats = [
    {
      value: 'Access Control',
      label: 'Zero‑Knowledge',
      color: '#8B5CF6',
      bgColor: '#8B5CF6'
    },
    {
      value: 'On‑Chain',
      label: 'Audit Trail',
      color: '#F472B6',
      bgColor: '#F472B6'
    },
    {
      value: 'Controls',
      label: 'SOC 2 Type II',
      color: '#F59E0B',
      bgColor: '#F59E0B'
    },
    {
      value: 'Data Safety',
      label: 'Pseudonymized',
      color: '#DB2777',
      bgColor: '#DB2777'
    }
  ];

  // Auto-rotating mini log events
  const [events, setEvents] = useState([
    { id: 1, label: 'ZK Verify', time: 'now', color: '#8B5CF6' },
    { id: 2, label: 'Receipt Minted', time: '1m', color: '#F472B6' },
    { id: 3, label: 'Payout Stream', time: '3m', color: '#F59E0B' },
    { id: 4, label: 'Policy Check', time: '5m', color: '#8B5CF6' },
    { id: 5, label: 'Consent Update', time: '7m', color: '#F59E0B' },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setEvents((arr) => {
        if (arr.length === 0) return arr;
        const [first, ...rest] = arr;
        return [...rest, first];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative py-20 bg-gradient-to-br from-[#14102E] via-[#0B0B1D] to-[#1C1440] overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      {/* Canvas genome field for depth */}
      <BackgroundGenomeField opacity={0.2} ribbons={2} nucleotides={70} speed={0.3} />
      {/* Icon layer for a bit of texture */}
      <BackgroundDNAIcons className="opacity-15" count={14} zIndex={0} />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content - Privacy Features */}
          <div className="space-y-8">
            {/* Section Header */}
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                <span className="text-white">Privacy by Design.</span>
                <br />
                <span className="bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] bg-clip-text text-transparent">Trust by Default.</span>
              </h2>

              <p className="text-xl text-[#D6D7FF] leading-relaxed">
                Zero‑knowledge access, lab‑grade proofs, on‑chain receipts. Your genome stays sovereign—always.
              </p>
            </div>

            {/* Privacy Features List */}
            <div className="space-y-6">
              {privacyFeatures.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="flex items-start space-x-4 p-4 rounded-xl bg-[#0B0B1D]/40 backdrop-blur-sm border border-[#8B5CF6]/10 hover:border-[#8B5CF6]/20 transition-all duration-300 group"
                >
                  {/* Icon */}
                  <div 
                    className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${feature.color}15`,
                      color: feature.color 
                    }}
                  >
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-2 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-[#D6D7FF] text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Security Dashboard (DNA animation removed) */}
          <div className="relative lg:h-[600px] flex items-center justify-center">
            {/* Security Timeline Overlay */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-80 max-w-sm">
              <div className="bg-[#0B0B1D]/85 backdrop-blur-xl border border-[#8B5CF6]/20 rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="mb-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Secure Access Flow</h3>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                      <span className="text-xs text-[#F59E0B]">Live</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#C9E1FF]/80 mt-1">From consent to payout—fully auditable.</p>
                </div>

                {/* Timeline */}
                <div className="relative pl-5 mb-6">
                  <div className="absolute left-2.5 top-0 bottom-0 w-px timeline-gradient" />
                  <div className="space-y-4">
                    {/* Step 1 */}
                    <div className="relative">
                      <div className="absolute -left-0.5 top-1 w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                      <div className="bg-[#14102E]/60 border border-[#8B5CF6]/20 rounded-lg p-3">
                        <div className="text-sm text-white font-medium">Consent Granted</div>
                        <div className="text-xs text-[#C9E1FF]/80">User approves policy + terms</div>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div className="relative">
                      <div className="absolute -left-0.5 top-1 w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                      <div className="bg-[#14102E]/60 border border-[#8B5CF6]/20 rounded-lg p-3">
                        <div className="text-sm text-white font-medium">ZK Access</div>
                        <div className="text-xs text-[#C9E1FF]/80">Zero‑knowledge proof gates the data</div>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div className="relative">
                      <div className="absolute -left-0.5 top-1 w-2 h-2 rounded-full bg-[#F472B6] animate-pulse" />
                      <div className="bg-[#14102E]/60 border border-[#F472B6]/20 rounded-lg p-3">
                        <div className="text-sm text-white font-medium">On‑Chain Receipt</div>
                        <div className="text-xs text-[#C9E1FF]/80">Usage event recorded immutably</div>
                      </div>
                    </div>
                    {/* Step 4 */}
                    <div className="relative">
                      <div className="absolute -left-0.5 top-1 w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                      <div className="bg-[#14102E]/60 border border-[#F59E0B]/20 rounded-lg p-3">
                        <div className="text-sm text-white font-medium">Payout Settled</div>
                        <div className="text-xs text-[#C9E1FF]/80">Rewards streamed to your wallet</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Latest Access Events */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs tracking-wide text-[#C9E1FF]/80 uppercase">Latest Access Events</span>
                    <span className="text-[10px] text-[#8B5CF6]">auto‑refresh</span>
                  </div>
                  <div className="space-y-2">
                    {events.slice(0,3).map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between p-2 bg-[#0B0B1D]/60 rounded-lg" style={{ border: `1px solid ${ev.color}26` }}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ev.color }} />
                          <span className="text-xs text-white">{ev.label}</span>
                        </div>
                        <span className="text-[10px] text-[#C9E1FF]/70">{ev.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Glow Effects */}
            <div className="absolute top-1/6 right-1/6 w-40 h-40 bg-[#F472B6]/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/6 left-1/6 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-2xl animate-pulse delay-1000" />
          </div>
        </div>
      </div>

      {/* Floating Security Elements */}
      <div className="absolute top-1/5 left-1/12 w-2 h-2 bg-[#F59E0B]/40 rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/12 w-1 h-1 bg-[#F59E0B]/60 rounded-full animate-ping" />
      <div className="absolute top-3/5 left-1/8 w-3 h-3 bg-[#8B5CF6]/30 rounded-full animate-pulse delay-700" />
    </section>
  );
};

export default PrivacyTrustSection;
