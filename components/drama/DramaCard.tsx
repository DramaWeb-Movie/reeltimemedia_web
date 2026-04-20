import Image from 'next/image';
import Link from 'next/link';
import type { Drama } from '@/types';
import Card from '@/components/ui/Card';
import { FaStar } from 'react-icons/fa';
import { FiPlay } from 'react-icons/fi';

interface DramaCardProps {
  drama: Drama;
  index?: number;
}

export default function DramaCard({ drama, index }: DramaCardProps) {
  return (
    <Link href={`/drama/${drama.id}`} className="group">
      <Card hover className="h-full bg-white border-gray-200 overflow-hidden shadow-sm">
        <div className="relative aspect-[2/3]">
          <Image
            src={drama.posterUrl}
            alt={drama.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          {/* Gradient Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Rank Badge (for most-watched) */}
          {index !== undefined && (
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-gradient-to-br from-brand-red to-brand-red flex items-center justify-center">
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
          )}

          {/* Rating Badge — only when DB provides a numeric score */}
          {drama.rating != null && (
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm">
              <FaStar className="text-accent-gold" />
              <span className="text-gray-900">{drama.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Play affordance — always visible on touch devices, hover reveal on pointer/mouse */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 touch-show transition-all duration-300">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand-red/90 backdrop-blur-sm flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg">
              <FiPlay className="text-white text-xl ml-1" />
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg mb-1 line-clamp-1 text-gray-900 group-hover:text-brand-red transition-colors">{drama.title}</h3>
          {drama.titleKh && (
            <p className="text-sm text-gray-500 mb-2 line-clamp-1" lang="km">{drama.titleKh}</p>
          )}
          <p className="text-sm text-gray-400 mb-3">{drama.releaseYear}</p>
          <div className="flex flex-wrap gap-1.5">
            {drama.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-xs bg-brand-red/10 text-brand-red px-2.5 py-1 rounded-full font-medium"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
