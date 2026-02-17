'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { FiSearch, FiBell, FiUser, FiMenu, FiX, FiGlobe, FiChevronDown, FiPlay } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const languages = ['English', 'Khmer', '中文', '한국어'];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-[#0F0F0F]/95 backdrop-blur-lg shadow-xl' : 'bg-gradient-to-b from-[#0F0F0F] to-transparent'
    }`}>
      <nav className="max-w-[1920px] mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0 hover:opacity-90 transition-opacity flex items-center gap-3 group">
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              <Image 
                src="/image/Reeltime Icon.png" 
                alt="ReelTime Media" 
                fill
                className="object-contain drop-shadow-lg group-hover:scale-105 transition-transform"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xl md:text-2xl font-bold tracking-tight">
                <span className="text-white">Reel</span>
                <span className="gradient-text">Time</span>
              </span>
              <span className="text-[10px] md:text-xs text-[#B3B3B3] tracking-[0.2em] uppercase">Media</span>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden lg:flex items-center gap-1 bg-[#1A1A1A]/80 rounded-full px-2 py-1 backdrop-blur-sm border border-[#333333]/50">
            <Link 
              href="/home" 
              className="px-5 py-2.5 text-sm font-medium text-white hover:text-[#E31837] transition-colors rounded-full hover:bg-white/5"
            >
              Home
            </Link>
            <Link 
              href="/browse" 
              className="px-5 py-2.5 text-sm font-medium text-[#B3B3B3] hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              Browse
            </Link>
            <Link 
              href="/movies" 
              className="px-5 py-2.5 text-sm font-medium text-[#B3B3B3] hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              Movies
            </Link>
            <Link 
              href="/series" 
              className="px-5 py-2.5 text-sm font-medium text-[#B3B3B3] hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              Series
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Search Bar - Desktop */}
            <div className="hidden md:flex items-center bg-[#1A1A1A] rounded-full px-4 py-2.5 w-64 lg:w-80 border border-[#333333]/50 focus-within:border-[#E31837]/50 transition-colors group">
              <FiSearch className="text-[#808080] text-lg mr-3 group-focus-within:text-[#E31837] transition-colors" />
              <input
                type="text"
                placeholder="Search movies, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white text-sm outline-none w-full placeholder-[#808080]"
              />
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Language Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className="flex items-center gap-2 text-[#B3B3B3] hover:text-white transition-colors px-3 py-2.5 rounded-full hover:bg-[#1A1A1A] border border-transparent hover:border-[#333333]/50"
                  aria-label="Select Language"
                >
                  <FiGlobe className="text-lg" />
                  <span className="text-sm font-medium hidden lg:inline">{selectedLanguage}</span>
                  <FiChevronDown className={`text-sm transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isLanguageOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#333333] py-2 z-50 overflow-hidden">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setIsLanguageOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#252525] transition-colors ${
                          selectedLanguage === lang ? 'text-[#E31837] font-medium bg-[#E31837]/10' : 'text-[#B3B3B3]'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoggedIn ? (
                <>
                  <button 
                    className="text-[#B3B3B3] hover:text-white transition-colors p-2.5 rounded-full hover:bg-[#1A1A1A] relative"
                    aria-label="Notifications"
                  >
                    <FiBell className="text-xl" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E31837] rounded-full"></span>
                  </button>
                  <Link 
                    href="/profile" 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E31837] to-[#E31837] flex items-center justify-center text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    <FiUser className="text-lg" />
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    href="/login" 
                    className="text-[#B3B3B3] hover:text-white transition-colors font-medium text-sm px-4 py-2"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/register" 
                    className="gradient-btn text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Search Button */}
            <button className="md:hidden p-2.5 text-[#B3B3B3] hover:text-white transition-colors">
              <FiSearch className="text-xl" />
            </button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2.5 text-[#B3B3B3] hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <FiX className="text-2xl" />
              ) : (
                <FiMenu className="text-2xl" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-[#333333] pt-4 animate-in slide-in-from-top duration-200">
            {/* Mobile Search */}
            <div className="flex items-center bg-[#1A1A1A] rounded-xl px-4 py-3 mb-4 border border-[#333333]">
              <FiSearch className="text-[#808080] text-lg mr-3" />
              <input
                type="text"
                placeholder="Search movies, series..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-white text-sm outline-none w-full placeholder-[#808080]"
              />
            </div>

            {/* Mobile Links */}
            <Link 
              href="/home" 
              className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-white hover:bg-[#1A1A1A] rounded-xl transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/browse" 
              className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] rounded-xl transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Browse
            </Link>
            <Link 
              href="/movies" 
              className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] rounded-xl transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Movies
            </Link>
            <Link 
              href="/series" 
              className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] rounded-xl transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              Series
            </Link>
            <Link 
              href="/search" 
              className="flex items-center gap-3 px-4 py-3.5 text-base font-medium text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] rounded-xl transition-all"
              onClick={() => setIsMenuOpen(false)}
            >
              <FiPlay className="text-sm" />
              App
            </Link>

            {/* Mobile Language Selector */}
            <div className="px-4 py-3">
              <label className="text-xs text-[#808080] font-medium mb-2 block uppercase tracking-wider">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333333] rounded-xl text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#1A1A1A]">
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Auth Buttons */}
            {isLoggedIn ? (
              <div className="px-4 pt-4 space-y-3">
                <Link 
                  href="/profile" 
                  className="flex items-center justify-center gap-3 w-full py-3 gradient-btn text-white rounded-xl font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiUser className="text-lg" />
                  Profile
                </Link>
              </div>
            ) : (
              <div className="px-4 pt-4 space-y-3">
                <Link 
                  href="/login" 
                  className="block w-full text-center py-3 border border-[#333333] text-white rounded-xl font-medium hover:bg-[#1A1A1A] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="block w-full text-center py-3 gradient-btn text-white rounded-xl font-semibold"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

