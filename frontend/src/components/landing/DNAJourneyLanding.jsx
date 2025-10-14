// Fixed DNA Galaxy Journey Landing Page

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import DNAJourneySystem from './3d/DNAJourneySystem.jsx';
import Scene3D from './3d/Scene3D.jsx';

// Simple working scroll hook (copied from SimpleDNAJourney)
const useSimpleScroll = () => {
  const [scrollData, setScrollData] = useState({
    scrollProgress: 0,
    scrollY: 0,
    isScrolling: false
  });
  
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      
      setScrollData({
        scrollProgress: progress,
        scrollY: scrolled,
        isScrolling: true
      });
      
      // Stop scrolling indicator after delay
      const timer = setTimeout(() => {
        setScrollData(prev => ({ ...prev, isScrolling: false }));
      }, 150);
      
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return scrollData;
};

// Simple Floating Navigation
const SimpleNavigation = ({ currentSection, scrollProgress }) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  const handleConnectWallet = () => {
    setIsWalletConnected(!isWalletConnected);
  };
  
  return (
    <div className="fixed top-6 left-0 right-0 z-40 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#0B0B1D]/70 backdrop-blur-xl border border-[#8B5CF6]/20 rounded-2xl px-6 py-4 shadow-2xl shadow-[#8B5CF6]/10">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="text-xl font-bold">
                <span className="text-[#8B5CF6]">Genomic</span>
                <span className="text-white">Chain</span>
              </div>
              <div className="hidden lg:flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
                <span className="text-xs text-[#D6D7FF] capitalize">{currentSection}</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="hidden md:flex items-center space-x-4">
              <button className="px-4 py-2 text-[#D6D7FF] hover:text-[#8B5CF6] transition-colors">About</button>
              <button className="px-4 py-2 text-[#D6D7FF] hover:text-[#8B5CF6] transition-colors">How it works</button>
              <button className="px-4 py-2 text-[#D6D7FF] hover:text-[#8B5CF6] transition-colors">Privacy</button>
            </div>

            {/* Connect Wallet */}
            <button
              onClick={handleConnectWallet}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isWalletConnected 
                  ? 'bg-[#34D399] text-white' 
                  : 'bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/80'
              }`}
            >
              {isWalletConnected ? 'Connected' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple Floating Section Content
const SimpleFloatingSection = ({ currentSection, scrollProgress }) => {
  const sections = {
    hero: {
      title: "Own Your Genome",
      subtitle: "License your impact on your terms",
      content: "Create a private vault and decide who can use your data for research."
    },
    howItWorks: {
      title: "How GeneTrust Works", 
      subtitle: "From vault to verified research",
      content: "Create Vault → Verify Provenance → Set Consent → License & Earn"
    },
    privacy: {
      title: "Privacy by Design. Trust by Default.",
      subtitle: "Zero‑knowledge controls, lab‑grade proofs", 
      content: "Your genome stays sovereign with on‑chain receipts for every access."
    },
    cta: {
      title: "Turn Your Genome Into Research Impact",
      subtitle: "Create your vault in minutes",
      content: "Approve access, track usage, and earn transparently."
    }
  };

  const sectionData = sections[currentSection] || sections.hero;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none max-w-2xl">
      <div className="bg-[#0B0B1D]/80 backdrop-blur-xl border border-[#8B5CF6]/20 rounded-2xl p-8 text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          {sectionData.title}
        </h2>
        <p className="text-lg text-[#D6D7FF] mb-4">
          {sectionData.subtitle}
        </p>
        <p className="text-[#D6D7FF] opacity-90 mb-6">
          {sectionData.content}
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 pointer-events-auto">
          <button className="px-8 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#8B5CF6]/25 transform hover:scale-105 transition-all duration-300">
            Get Started
          </button>
          <button className="px-6 py-3 text-[#34D399] border border-[#34D399]/30 rounded-lg hover:bg-[#34D399]/5 transition-all duration-300">
            Learn More
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className="mt-6 text-sm text-[#8B5CF6]">
          Journey Progress: {Math.round(scrollProgress * 100)}%
        </div>
      </div>
    </div>
  );
};

/**
 * DNAJourneyLanding Component - Fixed Version
 * Uses working patterns from SimpleDNAJourney
 */
const DNAJourneyLanding = () => {
  const { scrollProgress, isScrolling } = useSimpleScroll();
  const [currentSection, setCurrentSection] = useState('hero');
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Timer-based loading (like SimpleDNAJourney) instead of scroll-based
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Calculate current section based on scroll progress
  useEffect(() => {
    if (scrollProgress < 0.25) setCurrentSection('hero');
    else if (scrollProgress < 0.55) setCurrentSection('howItWorks');
    else if (scrollProgress < 0.85) setCurrentSection('privacy');
    else setCurrentSection('cta');
  }, [scrollProgress]);
  
  return (
    <div className="w-full bg-black" style={{ height: '500vh' }}>
      {/* DNA Journey Canvas - Full Screen Background */}
      <div className="fixed inset-0 z-0">
        <Canvas
          shadows
          dpr={[1, isMobile ? 1.5 : 2]}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
          }}
          camera={{ 
            position: [0, 0, 0],
            fov: isMobile ? 60 : 45,
            near: 0.1,
            far: 2000
          }}
        >
          <fog attach="fog" args={['#0B0B1D', 50, 200]} />
          
          <Scene3D isMobile={isMobile}>
            <DNAJourneySystem
              scrollProgress={scrollProgress}
              onSectionChange={setCurrentSection}
              isMobile={isMobile}
            />
          </Scene3D>
        </Canvas>
      </div>
      
      {/* Navigation */}
      <SimpleNavigation 
        currentSection={currentSection}
        scrollProgress={scrollProgress}
      />
      
      {/* Floating Content */}
      <SimpleFloatingSection
        currentSection={currentSection}
        scrollProgress={scrollProgress}
      />
      
      {/* Journey Progress Indicator */}
      <div className="fixed top-1/2 right-6 transform -translate-y-1/2 z-30">
        <div className="w-1 h-32 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="w-full bg-gradient-to-b from-[#8B5CF6] to-[#F472B6] rounded-full transition-all duration-300"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-[#8B5CF6] text-center">
          {Math.round(scrollProgress * 100)}%
        </div>
      </div>
      
      {/* Scroll Instruction */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex flex-col items-center space-y-2 animate-bounce">
          <span className="text-[#9AA0B2] text-xs">Scroll to travel through DNA</span>
          <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
      
      {/* Performance Monitor (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
          <div>Section: {currentSection}</div>
          <div>Progress: {(scrollProgress * 100).toFixed(1)}%</div>
          <div>Scrolling: {isScrolling ? 'Yes' : 'No'}</div>
          <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
        </div>
      )}
      
      {/* Loading Screen - Timer-based (like SimpleDNAJourney) */}
      <div 
        className={`fixed inset-0 z-50 bg-[#0B0B1D] flex items-center justify-center transition-opacity duration-1000 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            <span className="text-[#8B5CF6]">Genomic</span>Chain
          </h2>
          <p className="text-[#D6D7FF]">Preparing your DNA journey...</p>
        </div>
      </div>
    </div>
  );
};

export default DNAJourneyLanding;












// // Main DNA Galaxy Journey Landing Page - Revolutionary DNA tunnel experience

// import React, { useState, useEffect, useRef } from 'react';
// import { Canvas } from '@react-three/fiber';
// import DNAJourneySystem from './3d/DNAJourneySystem.jsx';
// import FloatingNavigation from './journey/FloatingNavigation.jsx';
// import FloatingSection from './journey/FloatingSection.jsx';
// import { useJourneyScroll } from './hooks/useJourneyScroll.js';

// /**
//  * DNAJourneyLanding Component
//  * Revolutionary landing page where users travel through a massive DNA tunnel
//  * Content sections float and fade in/out at specific DNA journey points
//  */
// const DNAJourneyLanding = () => {
//   const containerRef = useRef();
//   const [currentSection, setCurrentSection] = useState('hero');
//   const [isMobile, setIsMobile] = useState(false);
  
//   // Custom scroll system for DNA journey
//   const { scrollProgress, isScrolling } = useJourneyScroll({
//     container: containerRef.current,
//     smoothness: 0.1,
//     sensitivity: 1.0
//   });
  
//   // Detect mobile for simplified experience
//   useEffect(() => {
//     const checkMobile = () => {
//       setIsMobile(window.innerWidth < 768);
//     };
    
//     checkMobile();
//     window.addEventListener('resize', checkMobile);
//     return () => window.removeEventListener('resize', checkMobile);
//   }, []);
  
//   // Section content definitions
//   const sections = {
//     hero: {
//       title: "Take Control of Your DNA",
//       subtitle: "Journey through the future of genetic data ownership",
//       content: {
//         headline: "Securely store, manage, and monetize your genomic data while contributing to groundbreaking medical research.",
//         features: [
//           "256-bit Encryption",
//           "HIPAA Compliant", 
//           "Zero Breaches"
//         ]
//       },
//       cta: {
//         primary: "Begin Your Journey",
//         secondary: "Learn More"
//       }
//     },
//     howItWorks: {
//       title: "How GeneTrust Works",
//       subtitle: "Four simple steps along your DNA journey",
//       content: {
//         steps: [
//           {
//             number: "1",
//             title: "Upload & Encrypt",
//             description: "Securely upload your genomic data with encryption"
//           },
//           {
//             number: "2", 
//             title: "Lab Verification",
//             description: "Certified medical labs verify your data authenticity"
//           },
//           {
//             number: "3",
//             title: "Set Permissions", 
//             description: "Control who can access your data and under what conditions"
//           },
//           {
//             number: "4",
//             title: "Earn Tokens",
//             description: "Get paid when researchers access your verified data"
//           }
//         ]
//       }
//     },
//     privacy: {
//       title: "Built for Privacy, Designed for Trust",
//       subtitle: "Traveling through medical-grade security",
//       content: {
//         features: [
//           {
//             title: "End-to-End Encryption",
//             description: "Your data is encrypted before it leaves your device"
//           },
//           {
//             title: "Medical Lab Verification", 
//             description: "Certified labs verify data authenticity"
//           },
//           {
//             title: "Smart Contract Automation",
//             description: "Automated payments through transparent contracts"
//           }
//         ],
//         stats: {
//           encryption: "256-bit",
//           uptime: "99.9%",
//           compliance: "HIPAA",
//           breaches: "Zero"
//         }
//       }
//     },
//     cta: {
//       title: "Ready to Take Control of Your Genetic Data?",
//       subtitle: "Complete your DNA journey with us",
//       content: {
//         stats: [
//           { value: "10,000+", label: "Active Users" },
//           { value: "$2.5M+", label: "Earnings Distributed" },
//           { value: "500+", label: "Research Projects" }
//         ]
//       },
//       cta: {
//         primary: "Start Your Journey",
//         secondary: "Watch Demo"
//       }
//     }
//   };
  
//   // Handle section changes during DNA journey
//   const handleSectionChange = (sectionName) => {
//     setCurrentSection(sectionName);
//   };
  
//   return (
//     <div 
//       ref={containerRef}
//       className="relative w-full overflow-hidden bg-black"
//       style={{ height: '500vh' }} // 5x viewport height for journey
//     >
//       {/* DNA Journey Canvas - Full Screen Background */}
//       <div className="fixed inset-0 z-0">
//         <Canvas
//           shadows
//           dpr={[1, isMobile ? 1.5 : 2]}
//           gl={{ 
//             antialias: true,
//             alpha: false,
//             powerPreference: "high-performance"
//           }}
//           camera={{ 
//             position: [0, 0, 0],
//             fov: isMobile ? 60 : 45,
//             near: 0.1,
//             far: 2000
//           }}
//         >
//           {/* Enhanced Lighting for DNA Tunnel */}
//           <fog attach="fog" args={['#0F192D', 50, 200]} />
          
//           {/* Main DNA Journey System */}
//           <DNAJourneySystem
//             scrollProgress={scrollProgress}
//             onSectionChange={handleSectionChange}
//             isMobile={isMobile}
//           />
          
//           {/* Galaxy Background Effects */}
//           <mesh position={[0, -600, 0]} scale={[2000, 2000, 2000]}>
//             <sphereGeometry args={[1, 32, 32]} />
//             <meshBasicMaterial 
//               color="#0F192D" 
//               transparent 
//               opacity={0.3}
//               side={2} // THREE.BackSide
//             />
//           </mesh>
//         </Canvas>
//       </div>
      
//       {/* Floating Navigation - Part of DNA Journey */}
//       <FloatingNavigation 
//         currentSection={currentSection}
//         scrollProgress={scrollProgress}
//         isMobile={isMobile}
//       />
      
//       {/* Floating Content Sections */}
//       <div className="fixed inset-0 z-20 pointer-events-none">
//         {Object.entries(sections).map(([sectionName, sectionData]) => (
//           <FloatingSection
//             key={sectionName}
//             sectionName={sectionName}
//             currentSection={currentSection}
//             scrollProgress={scrollProgress}
//             data={sectionData}
//             isMobile={isMobile}
//           />
//         ))}
//       </div>
      
//       {/* Journey Progress Indicator */}
//       <div className="fixed top-1/2 right-6 transform -translate-y-1/2 z-30">
//         <div className="w-1 h-32 bg-gray-800 rounded-full overflow-hidden">
//           <div 
//             className="w-full bg-gradient-to-b from-[#2DD4BF] to-[#5594E0] rounded-full transition-all duration-300"
//             style={{ height: `${scrollProgress * 100}%` }}
//           />
//         </div>
//         <div className="mt-2 text-xs text-[#2DD4BF] text-center">
//           {Math.round(scrollProgress * 100)}%
//         </div>
//       </div>
      
//       {/* Performance Monitoring (Development) */}
//       {process.env.NODE_ENV === 'development' && (
//         <div className="fixed top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
//           <div>Section: {currentSection}</div>
//           <div>Progress: {(scrollProgress * 100).toFixed(1)}%</div>
//           <div>Scrolling: {isScrolling ? 'Yes' : 'No'}</div>
//           <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
//         </div>
//       )}
      
//       {/* Loading State */}
//       <div 
//         className={`fixed inset-0 z-50 bg-[#0F192D] flex items-center justify-center transition-opacity duration-1000 ${
//           scrollProgress > 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
//         }`}
//       >
//         <div className="text-center">
//           <div className="mb-4">
//             <div className="w-16 h-16 border-4 border-[#2DD4BF] border-t-transparent rounded-full animate-spin mx-auto" />
//           </div>
//           <h2 className="text-2xl font-bold text-white mb-2">
//             <span className="text-[#2DD4BF]">Gene</span>Trust
//           </h2>
//           <p className="text-[#C9E1FF]">Preparing your DNA journey...</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DNAJourneyLanding;
