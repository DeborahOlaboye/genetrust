// Main navigation component for GeneTrust landing page

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { showConnect } from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';
import { walletService } from '../../services/walletService.js';
import LanguageSelector from '../LanguageSelector/LanguageSelector';

/**
 * Navigation Component
 * Top navigation bar with GeneTrust branding and menu items
 * Includes Connect Wallet integration for Stacks blockchain
 */
// UserSession must be initialized only on the client to avoid SSR/localStorage issues

const Navigation = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userSessionRef = useRef(null);
  const navRef = useRef(null);

  // Navigation menu items from design
  const menuItems = [
    { label: 'About', href: '#about' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Researchers Dashboard', href: '/researcher' },
    { label: 'Upload Dataset', href: '/upload' },
    { label: 'Dashboard', href: '/' }
  ];

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [mobileMenuOpen]);

  // Close mobile menu when clicking outside the nav element
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuOpen && navRef.current && !navRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // On mount, initialize userSession and restore session if signed in
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (!userSessionRef.current) {
          const appConfig = new AppConfig(['store_write', 'publish_data']);
          userSessionRef.current = new UserSession({ appConfig });
        }
        const userSession = userSessionRef.current;
        if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          const addr = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '';
          setWalletAddress(addr);
          setIsWalletConnected(true);
          walletService.setAddress(addr);
        } else if (userSession.isSignInPending()) {
          userSession.handlePendingSignIn().then(() => {
            const userData = userSession.loadUserData();
            const addr = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '';
            setWalletAddress(addr);
            setIsWalletConnected(true);
            walletService.setAddress(addr);
          });
        }
      }
    } catch (e) {
      console.error('Wallet session restore error:', e);
    }
  }, []);

  // Connect / Disconnect wallet via Stacks Connect
  const handleConnectWallet = async () => {
    try {
      const userSession = userSessionRef.current;
      if (!userSession || !userSession.isUserSignedIn()) {
        showConnect({
          userSession,
          appDetails: {
            name: 'GeneTrust',
            icon: (typeof window !== 'undefined' ? window.location.origin : '') + '/favicon.svg',
          },
          redirectTo: '/',
          onFinish: () => {
            const userData = userSession?.loadUserData();
            const addr = userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet || '';
            setWalletAddress(addr);
            setIsWalletConnected(true);
            walletService.setAddress(addr);
          },
          onCancel: () => {
            console.log('User cancelled wallet connect');
          },
        });
      } else {
        userSession.signUserOut('/');
        setIsWalletConnected(false);
        setWalletAddress('');
        walletService.setAddress(null);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav ref={navRef} aria-label="Main navigation" className="relative z-50 bg-[#0B0B1D]/90 backdrop-blur-lg border-b border-[#8B5CF6]/15">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-2">
                <img src="/logo.svg" alt="GeneTrust" className="h-6 w-6" />
                <h1 className="text-xl font-bold text-white">
                  <span className="text-[#8B5CF6]">Gene</span>Trust
                </h1>
              </div>
            </div>
          </a>
          {/* Desktop Navigation Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {menuItems.map((item) => {
                const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium transition-colors duration-200 rounded-lg ${
                      isActive
                        ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
                        : 'text-gray-300 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Connect Wallet Button and Language Selector */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* Connect Wallet Button */}
            <button
              onClick={handleConnectWallet}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 
                ${isWalletConnected 
                  ? 'bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white border border-[#F59E0B]' 
                  : 'bg-[#8B5CF6] hover:bg-[#8B5CF6]/80 text-white border border-[#8B5CF6]'
                }
                hover:shadow-lg hover:shadow-[#8B5CF6]/25 transform hover:scale-105
              `}
            >
              {isWalletConnected ? (
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                  <span>{formatAddress(walletAddress)}</span>
                </span>
              ) : (
                'Connect Wallet'
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(open => !open)}
              className="bg-[#14102E] inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#8B5CF6]/10 transition-colors duration-200"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <span className="sr-only">{mobileMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
              {mobileMenuOpen ? (
                /* X icon */
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
      <div className="md:hidden" id="mobile-menu" role="navigation" aria-label="Mobile navigation menu">
        <div className="px-2 pt-2 pb-3 space-y-1 bg-[#14102E]/95 backdrop-blur-lg border-t border-[#8B5CF6]/10 animate-[slideDown_0.15s_ease-out]">
          {menuItems.map((item) => {
            const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
            return (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'text-[#8B5CF6] bg-[#8B5CF6]/10'
                  : 'text-gray-300 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5'
              }`}
            >
              {item.label}
            </a>
            );
          })}
          <div className="px-3 py-2 border-t border-[#8B5CF6]/10 mt-1 space-y-2">
            <LanguageSelector />
            <button
              onClick={() => { handleConnectWallet(); setMobileMenuOpen(false); }}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isWalletConnected
                  ? 'bg-[#F59E0B] text-white border border-[#F59E0B]'
                  : 'bg-[#8B5CF6] text-white border border-[#8B5CF6]'
              }`}
            >
              {isWalletConnected ? formatAddress(walletAddress) : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
      )}
    </nav>
  );
};

export default Navigation;
