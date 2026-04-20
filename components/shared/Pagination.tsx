'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslations('common');

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-max mx-auto">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0 ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
              : 'bg-white text-gray-700 hover:bg-brand-red hover:text-white border border-gray-200 shadow-sm'
          }`}
          aria-label={t('previousPage')}
        >
          <FiChevronLeft className="text-xl" />
        </button>

        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <div
                key={`ellipsis-${index}`}
                className="w-8 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-gray-400 shrink-0"
              >
                ...
              </div>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl font-medium transition-all duration-300 shrink-0 text-sm sm:text-base ${
                currentPage === page
                  ? 'bg-linear-to-r from-brand-red to-brand-red text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 shadow-sm'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0 ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
              : 'bg-white text-gray-700 hover:bg-brand-red hover:text-white border border-gray-200 shadow-sm'
          }`}
          aria-label={t('nextPage')}
        >
          <FiChevronRight className="text-xl" />
        </button>
      </div>
    </div>
  );
}
