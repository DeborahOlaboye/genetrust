// Main navigation component for GeneTrust landing page

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { showConnect } from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';
import toast from 'react-hot-toast';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userSessionRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Navigation menu items from design
  const menuItems = [
    { label: 'About', href: '#about' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Researchers Dashboard', href: '#researchers-dashboard' },
    { label: 'Dashboard', href: '#dashboard' }
  ];

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
            toast('Wallet connection cancelled', { icon: 'ℹ️' });
          },
        });
      } else {
        userSession.signUserOut('/');
        setIsWalletConnected(false);
        setWalletAddress('');
        walletService.setAddress(null);
        toast.success('Wallet disconnected');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error(error?.message || 'Failed to connect wallet. Please try again.');
    }
  };

  // Close mobile menu when user clicks outside the nav
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleOutsideClick = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        closeMobileMenu();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Toggle mobile menu open/closed
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  // Close mobile menu explicitly (used by link clicks and outside-click handler)
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav aria-label="Main navigation" className="relative z-50 bg-[#0B0B1D]/90 backdrop-blur-lg border-b border-[#8B5CF6]/15">
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
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-300 hover:text-[#8B5CF6] px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[#8B5CF6]/5 rounded-lg"
                >
                  {item.label}
                </a>
              ))}
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
              className="bg-[#14102E] inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#8B5CF6]/10 transition-colors duration-200"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="true"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
              {/* Hamburger / X icon toggles with menu state */}
              {isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - controlled by isMobileMenuOpen state */}
      <div
        className="md:hidden"
        id="mobile-menu"
        ref={mobileMenuRef}
        hidden={!isMobileMenuOpen}
        role="region"
        aria-label="Mobile navigation menu"
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-[#14102E]/95 backdrop-blur-lg border-t border-[#8B5CF6]/15 animate-[fadeIn_0.15s_ease-out]">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={closeMobileMenu}
              className="text-gray-300 hover:text-[#8B5CF6] block px-3 py-2 text-base font-medium hover:bg-[#8B5CF6]/5 rounded-lg transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
          <div className="px-3 py-2">
            <LanguageSelector />
          </div>
          <hr className="border-[#8B5CF6]/15 my-1" />
          <div className="px-3 py-2">
            <button
              onClick={() => { closeMobileMenu(); setTimeout(handleConnectWallet, 150); }}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isWalletConnected
                  ? 'bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-white border border-[#F59E0B]'
                  : 'bg-[#8B5CF6] hover:bg-[#8B5CF6]/80 text-white border border-[#8B5CF6]'
                }`}
            >
              {isWalletConnected ? formatAddress(walletAddress) : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
