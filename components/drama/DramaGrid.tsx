import type { Drama } from '@/types';
import DramaCard from './DramaCard';
import { FiFilm } from 'react-icons/fi';
import { CATALOG_CARD_GRID } from '@/lib/catalog/grid';

interface DramaGridProps {
  dramas: Drama[];
  emptyMessage?: string;
}

export default function DramaGrid({
  dramas,
  emptyMessage = 'No content found'
}: DramaGridProps) {
  if (dramas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FiFilm className="text-3xl text-gray-400" />
        </div>
        <p className="text-xl text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={CATALOG_CARD_GRID}>
      {dramas.map((drama) => (
        <DramaCard key={drama.id} drama={drama} />
      ))}
    </div>
  );
}
