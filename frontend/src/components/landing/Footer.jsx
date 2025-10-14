// Main footer component for GeneTrust landing page

import React from 'react';

/**
 * Footer Component
 * Multi-column footer with links and company information
 * Follows the exact design layout with web3 styling
 */
const Footer = () => {
  const footerSections = {
    geneTrust: {
      title: 'GeneTrust',
      description: 'Empowering individuals to control and monetize their genetic data through blockchain technology.',
      links: []
    },
    platform: {
      title: 'Platform',
      links: [
        { label: 'Dashboard', href: '#dashboard' },
        { label: 'Upload Data', href: '#upload' },
        { label: 'Marketplace', href: '#marketplace' },
        { label: 'Privacy Settings', href: '#privacy' }
      ]
    },
    resources: {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#docs' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Support', href: '#support' },
        { label: 'Blog', href: '#blog' }
      ]
    },
    legal: {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#privacy-policy' },
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Compliance', href: '#compliance' },
        { label: 'Security', href: '#security' }
      ]
    }
  };

  return (
    <footer className="relative bg-gradient-to-b from-[#0B0B1D] to-[#0A0A0A] border-t border-[#8B5CF6]/10">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#14102E]/20 via-transparent to-[#1C1440]/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* GeneTrust Brand Section */}
          <div className="lg:col-span-1">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-4">
                <span className="text-[#8B5CF6]">Gene</span>Trust
              </h3>
              <p className="text-[#6D7978] text-sm leading-relaxed">
                {footerSections.geneTrust.description}
              </p>
            </div>
            
            {/* Social Links - TODO: Add actual social media links */}
            <div className="flex space-x-4">
              <a 
                href="#twitter" 
                className="text-[#6D7978] hover:text-[#8B5CF6] transition-colors duration-200"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a 
                href="#github" 
                className="text-[#6D7978] hover:text-[#8B5CF6] transition-colors duration-200"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="#discord" 
                className="text-[#6D7978] hover:text-[#8B5CF6] transition-colors duration-200"
                aria-label="Discord"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.942 6.478c-1.5-.69-3.108-1.194-4.798-1.482a.082.082 0 00-.087.041c-.207.369-.437.851-.597 1.229-1.765-.264-3.52-.264-5.246 0-.16-.386-.398-.86-.606-1.229a.085.085 0 00-.087-.04c-1.69.287-3.298.79-4.798 1.481a.077.077 0 00-.035.03C.184 9.757-.11 12.966.034 16.127a.093.093 0 00.035.063 13.325 13.325 0 004.01 2.025.085.085 0 00.092-.03c.506-.69.958-1.418 1.347-2.183a.08.08 0 00-.044-.111 8.76 8.76 0 01-1.25-.595.081.081 0 01-.008-.135c.084-.063.168-.128.248-.194a.082.082 0 01.085-.012c2.622 1.196 5.46 1.196 8.052 0a.082.082 0 01.086.011c.08.067.164.132.248.195a.081.081 0 01-.006.135 8.222 8.222 0 01-1.251.596.08.08 0 00-.043.111c.395.765.847 1.492 1.347 2.183a.084.084 0 00.092.03 13.285 13.285 0 004.01-2.025.082.082 0 00.035-.062c.169-3.65-.284-6.82-1.2-9.649a.065.065 0 00-.035-.031zM6.678 13.482c-.8 0-1.46-.734-1.46-1.636s.645-1.636 1.46-1.636c.823 0 1.473.743 1.46 1.636 0 .902-.645 1.636-1.46 1.636zm6.644 0c-.8 0-1.46-.734-1.46-1.636s.645-1.636 1.46-1.636c.823 0 1.473.743 1.46 1.636 0 .902-.637 1.636-1.46 1.636z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footerSections.platform.title}</h4>
            <ul className="space-y-3">
              {footerSections.platform.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[#6D7978] hover:text-[#8B5CF6] text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footerSections.resources.title}</h4>
            <ul className="space-y-3">
              {footerSections.resources.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[#6D7978] hover:text-[#2DD4BF] text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{footerSections.legal.title}</h4>
            <ul className="space-y-3">
              {footerSections.legal.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[#6D7978] hover:text-[#2DD4BF] text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-[#8B5CF6]/10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-[#6D7978] text-sm">
              © 2025 GeneTrust. All rights reserved.
            </div>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-[#6D7978] text-sm">Powered by Stacks Blockchain</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
                <span className="text-[#F59E0B] text-sm font-medium">Network Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
