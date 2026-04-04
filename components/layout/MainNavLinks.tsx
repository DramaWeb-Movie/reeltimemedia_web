'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isMainNavActive } from '@/components/layout/mainNav';

const ITEMS = [
  { href: '/home', key: 'home' as const },
  { href: '/browse', key: 'browse' as const },
  { href: '/movies', key: 'movies' as const },
  { href: '/series', key: 'series' as const },
];

export default function MainNavLinks() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <div className="hidden lg:flex items-center gap-1 bg-gray-100/80 rounded-full px-2 py-1 backdrop-blur-sm border border-gray-200/70">
      {ITEMS.map(({ href, key }) => {
        const active = isMainNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'px-5 py-2.5 text-sm font-semibold text-brand-red bg-white rounded-full shadow-sm ring-1 ring-gray-200/90 transition-colors'
                : 'px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100'
            }
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
