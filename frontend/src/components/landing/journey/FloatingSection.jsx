// Floating content sections that appear at specific DNA journey points

import React from 'react';

/**
 * FloatingSection Component
 * Content sections that fade in/out as users travel through DNA tunnel
 * Each section appears at specific coordinates along the DNA journey
 */
const FloatingSection = ({ 
  sectionName, 
  currentSection, 
  scrollProgress, 
  data, 
  isMobile = false 
}) => {
  
  // Calculate section visibility and animation
  const getSectionStyle = () => {
    const isActive = currentSection === sectionName;
    const opacity = isActive ? 1 : 0;
    const translateY = isActive ? 0 : 20;
    const scale = isActive ? 1 : 0.95;
    
    return {
      opacity,
      transform: `translateY(${translateY}px) scale(${scale})`,
      transition: 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)',
      pointerEvents: isActive ? 'auto' : 'none'
    };
  };

  // Get section positioning based on screen size
  const getSectionPosition = () => {
    if (isMobile) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '400px'
      };
    }

    // Desktop positioning - different for each section
    const positions = {
      hero: {
        position: 'fixed',
        top: '50%',
        left: '10%',
        transform: 'translateY(-50%)',
        width: '500px'
      },
      howItWorks: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px'
      },
      privacy: {
        position: 'fixed',
        top: '50%',
        right: '10%',
        transform: 'translateY(-50%)',
        width: '500px'
      },
      cta: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px'
      }
    };

    return positions[sectionName] || positions.hero;
  };

  // Render different section types
  const renderSectionContent = () => {
    switch (sectionName) {
      case 'hero':
        return <HeroContent data={data} isMobile={isMobile} />;
      case 'howItWorks':
        return <HowItWorksContent data={data} isMobile={isMobile} />;
      case 'privacy':
        return <PrivacyContent data={data} isMobile={isMobile} />;
      case 'cta':
        return <CTAContent data={data} isMobile={isMobile} />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        ...getSectionPosition(),
        ...getSectionStyle(),
        zIndex: 20
      }}
    >
      <div className="bg-[#0F192D]/80 backdrop-blur-xl border border-[#2DD4BF]/20 rounded-2xl p-8 shadow-2xl shadow-[#2DD4BF]/10">
        {renderSectionContent()}
      </div>
    </div>
  );
};

// Hero Section Content
const HeroContent = ({ data, isMobile }) => (
  <div className="text-center space-y-6">
    {/* Blockchain Badge */}
    <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/20">
      <div className="w-2 h-2 bg-[#2DD4BF] rounded-full mr-3 animate-pulse" />
      <span className="text-[#2DD4BF] text-sm font-medium">Powered by Blockchain Technology</span>
    </div>

    {/* Main Title */}
    <h1 className={`font-bold leading-tight ${isMobile ? 'text-3xl' : 'text-5xl'}`}>
      <span className="text-white">{data.title}</span>
    </h1>

    {/* Subtitle */}
    <p className={`text-[#C9E1FF] leading-relaxed ${isMobile ? 'text-lg' : 'text-xl'}`}>
      {data.subtitle}
    </p>

    {/* Description */}
    <p className="text-[#C9E1FF] opacity-90">
      {data.content.headline}
    </p>

    {/* Features */}
    <div className="flex justify-center space-x-8">
      {data.content.features.map((feature, index) => (
        <div key={index} className="text-center">
          <div className="text-lg font-bold text-[#2DD4BF]">{feature}</div>
        </div>
      ))}
    </div>

    {/* CTA Buttons */}
    <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
      <button className="group px-8 py-3 bg-gradient-to-r from-[#2DD4BF] to-[#20A7BD] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#2DD4BF]/25 transform hover:scale-105 transition-all duration-300">
        <span className="flex items-center space-x-2">
          <span>{data.cta.primary}</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <button className="px-6 py-3 text-[#2DD4BF] border border-[#2DD4BF]/30 rounded-lg hover:bg-[#2DD4BF]/5 transition-all duration-300">
        {data.cta.secondary}
      </button>
    </div>
  </div>
);

// How It Works Section Content
const HowItWorksContent = ({ data, isMobile }) => (
  <div className="text-center space-y-8">
    <div>
      <h2 className={`font-bold text-white mb-4 ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
        {data.title}
      </h2>
      <p className="text-[#C9E1FF] text-lg">{data.subtitle}</p>
    </div>

    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {data.content.steps.map((step, index) => (
        <div key={index} className="bg-[#121F40]/40 backdrop-blur-sm border border-[#2DD4BF]/10 rounded-xl p-6 text-center">
          <div className="w-12 h-12 bg-[#2DD4BF] text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
            {step.number}
          </div>
          <h3 className="text-white font-semibold mb-2">{step.title}</h3>
          <p className="text-[#C9E1FF] text-sm">{step.description}</p>
        </div>
      ))}
    </div>
  </div>
);

// Privacy Section Content
const PrivacyContent = ({ data, isMobile }) => (
  <div className="space-y-8">
    <div className="text-center">
      <h2 className={`font-bold text-white mb-4 ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
        {data.title}
      </h2>
      <p className="text-[#C9E1FF] text-lg">{data.subtitle}</p>
    </div>

    {/* Features */}
    <div className="space-y-4">
      {data.content.features.map((feature, index) => (
        <div key={index} className="flex items-start space-x-4 p-4 bg-[#121F40]/40 backdrop-blur-sm border border-[#2DD4BF]/10 rounded-xl">
          <div className="w-3 h-3 bg-[#2DD4BF] rounded-full mt-2 flex-shrink-0" />
          <div>
            <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
            <p className="text-[#C9E1FF] text-sm">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Stats */}
    <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
      {Object.entries(data.content.stats).map(([key, value]) => (
        <div key={key} className="text-center p-3 bg-[#2DD4BF]/10 rounded-lg border border-[#2DD4BF]/20">
          <div className="text-xl font-bold text-[#2DD4BF]">{value}</div>
          <div className="text-xs text-[#C9E1FF] capitalize">{key}</div>
        </div>
      ))}
    </div>
  </div>
);

// CTA Section Content
const CTAContent = ({ data, isMobile }) => (
  <div className="text-center space-y-8">
    <div>
      <h2 className={`font-bold text-white mb-4 ${isMobile ? 'text-2xl' : 'text-4xl'}`}>
        {data.title}
      </h2>
      <p className="text-[#C9E1FF] text-lg">{data.subtitle}</p>
    </div>

    {/* Stats */}
    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
      {data.content.stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-3xl font-bold text-[#2DD4BF] mb-1">{stat.value}</div>
          <div className="text-sm text-[#6D7978]">{stat.label}</div>
        </div>
      ))}
    </div>

    {/* Final CTA */}
    <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
      <button className="group px-10 py-4 bg-gradient-to-r from-[#2DD4BF] to-[#20A7BD] text-white font-semibold rounded-lg hover:shadow-2xl hover:shadow-[#2DD4BF]/25 transform hover:scale-105 transition-all duration-300">
        <span className="flex items-center space-x-2">
          <span>{data.cta.primary}</span>
          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
      <button className="px-8 py-4 text-[#2DD4BF] border border-[#2DD4BF]/30 rounded-lg hover:bg-[#2DD4BF]/5 transition-all duration-300">
        {data.cta.secondary}
      </button>
    </div>
  </div>
);

export default FloatingSection;
