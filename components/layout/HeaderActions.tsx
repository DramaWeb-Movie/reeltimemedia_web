'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiUser, FiMenu, FiX, FiGlobe, FiChevronDown, FiPlay } from 'react-icons/fi';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { isMainNavActive } from '@/components/layout/mainNav';
import type { User } from '@supabase/supabase-js';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'km', label: 'ខ្មែរ' },
];

const MOBILE_ROOT_ID = 'header-mobile-root';

type HeaderActionsProps = {
  initialUser: User | null;
  mobileRootId?: string;
};

export default function HeaderActions({ initialUser, mobileRootId = MOBILE_ROOT_ID }: HeaderActionsProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof document === 'undefined') return 'km';
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    return match ? match[1] : 'km';
  });
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [sessionLoggedIn, setSessionLoggedIn] = useState<boolean | null>(null);

  const mobileEl = typeof document !== 'undefined' ? document.getElementById(mobileRootId) : null;

  const isLoggedIn = sessionLoggedIn ?? !!initialUser;

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Lock body scroll while the mobile nav drawer is open so the page behind it
  // doesn't scroll under the user's fingers.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMenuOpen) {
      document.body.classList.add('no-scroll');
      return () => document.body.classList.remove('no-scroll');
    }
  }, [isMenuOpen]);

  // Close the drawer when the user navigates to a new route.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const switchLanguage = useCallback((code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setCurrentLocale(code);
    setIsLanguageOpen(false);
    router.refresh();
  }, [router]);

  const selectedLabel = LANGUAGES.find((l) => l.code === currentLocale)?.label ?? 'ខ្មែរ';

  return (
    <>
      {/* Right Section */}
      <div className="flex items-center gap-3 md:gap-4">
        <ThemeToggle className="md:hidden" />
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2.5 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 dark:hover:border-gray-600"
              aria-label={t('selectLanguage')}
            >
              <FiGlobe className="text-lg" />
              <span className="text-sm font-medium hidden lg:inline">{selectedLabel}</span>
              <FiChevronDown className={`text-sm transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`} />
            </button>
            {isLanguageOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden dark:bg-gray-900 dark:border-gray-700">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => switchLanguage(lang.code)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors dark:hover:bg-gray-800 ${
                      currentLocale === lang.code ? 'text-brand-red font-medium bg-red-50 dark:bg-red-950/40' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className="w-10 h-10 rounded-full bg-linear-to-br from-brand-red to-brand-red flex items-center justify-center text-white font-semibold hover:opacity-90 transition-opacity"
              >
                <FiUser className="text-lg" />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm px-4 py-2"
              >
                {tAuth('signIn')}
              </Link>
              <Link
                href="/register"
                className="gradient-btn text-white px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg"
              >
                {tAuth('getStarted')}
              </Link>
            </div>
          )}
        </div>

        <button
          className="md:hidden p-2.5 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={t('toggleMenu')}
        >
          {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
        </button>
      </div>

      {/* Backdrop — closes the menu when tapping outside */}
      {isMenuOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 top-16 z-30 bg-black/40 backdrop-blur-[1px]"
          aria-label={t('toggleMenu')}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation (portaled into nav so it appears below the flex row) */}
      {mobileEl &&
        isMenuOpen &&
        createPortal(
          <div className="md:hidden relative z-40 mt-4 pb-4 space-y-2 border-t border-gray-200 pt-4 animate-in slide-in-from-top duration-200 bg-white/95 backdrop-blur-lg rounded-2xl px-2 dark:border-gray-700 dark:bg-gray-950/95 max-h-[75dvh] overflow-y-auto safe-pb">
            <Link
              href="/home"
              aria-current={isMainNavActive(pathname, '/home') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                isMainNavActive(pathname, '/home')
                  ? 'text-brand-red bg-red-50/80 font-semibold ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t('home')}
            </Link>
            <Link
              href="/browse"
              aria-current={isMainNavActive(pathname, '/browse') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                isMainNavActive(pathname, '/browse')
                  ? 'text-brand-red bg-red-50/80 font-semibold ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t('browse')}
            </Link>
            <Link
              href="/movies"
              aria-current={isMainNavActive(pathname, '/movies') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                isMainNavActive(pathname, '/movies')
                  ? 'text-brand-red bg-red-50/80 font-semibold ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t('movies')}
            </Link>
            <Link
              href="/series"
              aria-current={isMainNavActive(pathname, '/series') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                isMainNavActive(pathname, '/series')
                  ? 'text-brand-red bg-red-50/80 font-semibold ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t('series')}
            </Link>
            <Link
              href="/search"
              aria-current={pathname === '/search' || pathname.startsWith('/search/') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-all ${
                pathname === '/search' || pathname.startsWith('/search/')
                  ? 'text-brand-red bg-red-50/80 font-semibold ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <FiPlay className="text-sm" />
              {t('app')}
            </Link>
            <div className="px-4 py-3">
              <label className="text-xs text-gray-500 font-medium mb-2 block uppercase tracking-wider">{t('language')}</label>
              <select
                value={currentLocale}
                onChange={(e) => switchLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-red transition-colors"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#1A1A1A]">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            {isLoggedIn ? (
              <div className="px-4 pt-4 space-y-3">
                <Link href="/profile" className="flex items-center justify-center gap-3 w-full py-3 gradient-btn text-white rounded-xl font-semibold" onClick={() => setIsMenuOpen(false)}>
                  <FiUser className="text-lg" />
                  {tAuth('profile')}
                </Link>
              </div>
            ) : (
              <div className="px-4 pt-4 space-y-3">
                <Link href="/login" className="block w-full text-center py-3 border border-gray-200 text-gray-900 rounded-xl font-medium hover:bg-gray-100 transition-colors" onClick={() => setIsMenuOpen(false)}>
                  {tAuth('signIn')}
                </Link>
                <Link href="/register" className="block w-full text-center py-3 gradient-btn text-white rounded-xl font-semibold" onClick={() => setIsMenuOpen(false)}>
                  {tAuth('getStarted')}
                </Link>
              </div>
            )}
          </div>,
          mobileEl
        )}
    </>
  );
}
