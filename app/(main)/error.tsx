'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { FiHome, FiRefreshCw } from 'react-icons/fi';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 text-sm mb-6">
          We could not load this page. Please try again or return home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-brand-red text-white hover:bg-brand-red-dark transition-colors"
          >
            <FiRefreshCw className="text-lg" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FiHome className="text-lg" /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
