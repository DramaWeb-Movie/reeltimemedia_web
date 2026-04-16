'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiMoon, FiSun } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'reeltimemedia-theme';

function readDarkFromDom(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('nav');
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(readDarkFromDom());
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    const next = !readDarkFromDom();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
    setDark(next);
  }, []);

  const baseBtn =
    'p-2.5 rounded-full transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10';

  if (!mounted) {
    return (
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`${baseBtn} ${className}`}
      aria-label={dark ? t('themeLight') : t('themeDark')}
    >
      {dark ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
    </button>
  );
}
