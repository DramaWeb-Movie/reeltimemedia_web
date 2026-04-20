'use client';

import { useState, useEffect, type ReactNode } from 'react';

type HeaderScrollWrapperProps = {
  leftContent: ReactNode;
  rightContent: ReactNode;
};

export default function HeaderScrollWrapper({ leftContent, rightContent }: HeaderScrollWrapperProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-pt ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-lg shadow-md border-b border-[#E5E7EB] dark:bg-gray-950/95 dark:border-gray-800'
          : 'bg-gradient-to-b from-white/90 to-transparent dark:from-gray-950/90 dark:to-transparent'
      }`}
    >
      <nav className="max-w-[1920px] mx-auto px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between gap-6">
          {leftContent}
          {rightContent}
        </div>
        <div id="header-mobile-root" />
      </nav>
    </header>
  );
}
