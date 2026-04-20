'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  /** Controlled value. When provided, internal state is ignored. */
  value?: string;
  /** Initial value for uncontrolled usage (e.g. seeded from URL). */
  initialValue?: string;
}

export default function SearchBar({
  placeholder,
  onSearch,
  value,
  initialValue = '',
}: SearchBarProps) {
  const t = useTranslations('common');
  const [internal, setInternal] = useState(initialValue);
  const router = useRouter();

  const isControlled = typeof value === 'string';
  const query = isControlled ? (value as string) : internal;

  const handleChange = (next: string) => {
    if (!isControlled) setInternal(next);
    if (onSearch) onSearch(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (onSearch) {
      onSearch(trimmed);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 px-4 sm:px-5 py-3.5 sm:py-4 pl-12 sm:pl-14 pr-24 sm:pr-28 rounded-2xl bg-[#1A1A1A] border border-[#333333] text-white placeholder-[#808080] focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all text-base"
        />
        <FiSearch className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808080] pointer-events-none" />
        <button
          type="submit"
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-2 min-h-[40px] bg-gradient-to-r from-brand-red to-brand-red text-white rounded-xl font-medium hover:opacity-90 transition-opacity text-sm"
        >
          {t('search')}
        </button>
      </div>
    </form>
  );
}
