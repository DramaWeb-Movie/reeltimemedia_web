import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col justify-start sm:justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden safe-pt safe-pb">
      {/* Subtle background accent */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-red rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-red rounded-full blur-[150px]" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-6 sm:mb-8 group">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14">
            <Image
              src="/image/Reeltime Icon.png"
              alt="ReelTime Media"
              fill
              className="object-contain"
              sizes="56px"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              <span className="text-gray-900">Reel</span>
              <span className="gradient-text">Time</span>
            </span>
            <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">Media</span>
          </div>
        </Link>

        {/* Title */}
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-center text-sm text-gray-500 px-2">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-6 sm:py-8 px-5 sm:px-10 shadow-lg rounded-2xl border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
