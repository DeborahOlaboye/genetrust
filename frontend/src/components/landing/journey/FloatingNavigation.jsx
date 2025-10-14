// Floating navigation that's part of the DNA journey experience

import React, { useState } from 'react';

/**
 * FloatingNavigation Component
 * Navigation that floats within the DNA tunnel experience
 * Adapts position and appearance based on journey progress
 */
const FloatingNavigation = ({ 
  currentSection, 
  scrollProgress, 
  isMobile = false 
}) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Navigation items
  const menuItems = [
    { label: 'About', section: 'hero' },
    { label: 'How it works', section: 'howItWorks' },
    { label: 'Privacy', section: 'privacy' },
    { label: 'Get Started', section: 'cta' }
  ];

  // Calculate navigation position and appearance based on DNA journey
  const getNavigationStyle = () => {
    const opacity = currentSection === 'hero' ? 1 : 0.9;
    const transform = `translateY(${Math.sin(scrollProgress * Math.PI * 4) * 2}px)`;
    
    return {
      opacity,
      transform,
      transition: 'all 0.3s ease-out'
    };
  };

  // Connect wallet function
  const handleConnectWallet = async () => {
    try {
      if (!isWalletConnected) {
        // Simulate wallet connection
        setIsWalletConnected(true);
        setWalletAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
      } else {
        // Disconnect wallet
        setIsWalletConnected(false);
        setWalletAddress('');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  // Navigate to section by scrolling
  const navigateToSection = (targetSection) => {
    const sectionPositions = {
      hero: 0,
      howItWorks: 0.25,
      privacy: 0.55,
      cta: 0.85
    };

    const targetPosition = sectionPositions[targetSection] || 0;
    const targetScrollY = targetPosition * (document.documentElement.scrollHeight - window.innerHeight);
    
    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  };

  // Format wallet address
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isMobile) {
    // Mobile navigation - simplified floating design
    return (
      <div 
        className="fixed top-4 left-0 right-0 z-40 px-4"
        style={getNavigationStyle()}
      >
        <div className="bg-[#0F192D]/80 backdrop-blur-lg border border-[#2DD4BF]/20 rounded-full px-4 py-2 mx-auto max-w-sm">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-lg font-bold">
              <span className="text-[#2DD4BF]">Gene</span>
              <span className="text-white">Trust</span>
            </div>

            {/* Connect Wallet */}
            <button
              onClick={handleConnectWallet}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                isWalletConnected 
                  ? 'bg-[#37A36B]/20 text-[#37A36B] border border-[#37A36B]/30' 
                  : 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30'
              }`}
            >
              {isWalletConnected ? formatAddress(walletAddress) : 'Connect'}
            </button>
          </div>
        </div>

        {/* Mobile section indicator */}
        <div className="text-center mt-2">
          <span className="text-xs text-[#2DD4BF] capitalize bg-[#0F192D]/60 px-3 py-1 rounded-full">
            {currentSection.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>
      </div>
    );
  }

  // Desktop navigation - full floating experience
  return (
    <div 
      className="fixed top-6 left-0 right-0 z-40 px-8"
      style={getNavigationStyle()}
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#0F192D]/70 backdrop-blur-xl border border-[#2DD4BF]/20 rounded-2xl px-6 py-4 shadow-2xl shadow-[#2DD4BF]/10">
          <div className="flex items-center justify-between">
            {/* Logo with journey indicator */}
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold">
                <span className="text-[#2DD4BF]">Gene</span>
                <span className="text-white">Trust</span>
              </div>
              
              {/* Journey progress indicator */}
              <div className="hidden lg:flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-pulse" />
                <span className="text-xs text-[#C9E1FF] capitalize">
                  {currentSection.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigateToSection(item.section)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    currentSection === item.section
                      ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30'
                      : 'text-[#C9E1FF] hover:text-[#2DD4BF] hover:bg-[#2DD4BF]/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Connect Wallet Button */}
            <button
              onClick={handleConnectWallet}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isWalletConnected 
                  ? 'bg-[#37A36B] hover:bg-[#37A36B]/80 text-white border border-[#37A36B]' 
                  : 'bg-[#5594E0] hover:bg-[#5594E0]/80 text-white border border-[#5594E0]'
              } hover:shadow-lg hover:shadow-[#5594E0]/25`}
            >
              {isWalletConnected ? (
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#2DD4BF] rounded-full animate-pulse" />
                  <span>{formatAddress(walletAddress)}</span>
                </span>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>
        </div>

        {/* DNA Journey Navigation Aid */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 bg-[#0F192D]/60 backdrop-blur-sm border border-[#2DD4BF]/10 rounded-full px-4 py-2">
            <svg className="w-4 h-4 text-[#2DD4BF] animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span className="text-xs text-[#C9E1FF]">
              Scroll to travel through your DNA
            </span>
            <div className="w-1 h-1 bg-[#2DD4BF] rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingNavigation;
