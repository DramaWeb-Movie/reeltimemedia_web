import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: ReactNode;
  viewAllHref: string;
  viewAllLabel: string;
  /** Tailwind classes for the vertical accent bar (defaults to solid red) */
  accentClass?: string;
}

export default function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel,
  accentClass = 'bg-brand-red',
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full ${accentClass}`} />
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h2>
      </div>
      <Link
        href={viewAllHref}
        className="text-brand-red hover:text-brand-red/80 font-medium transition-colors text-sm flex items-center gap-1"
      >
        {viewAllLabel}
        <FiChevronRight className="text-lg" />
      </Link>
    </div>
  );
}
