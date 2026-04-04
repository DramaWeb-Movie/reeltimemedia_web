'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch } from 'react-icons/fi';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({ 
  placeholder = 'Search movies & dramas...', 
  onSearch 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onSearch) onSearch(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full px-5 py-4 pl-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] text-white placeholder-[#808080] focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
        />
        <FiSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#808080]" />
        <button 
          type="submit"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-brand-red to-brand-red text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </div>
    </form>
  );
}

