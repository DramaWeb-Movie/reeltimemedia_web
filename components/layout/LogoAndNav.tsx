import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

export default async function LogoAndNav() {
  const t = await getTranslations('nav');

  return (
    <>
      <Link href="/" className="shrink-0 hover:opacity-90 transition-opacity flex items-center gap-3 group">
        <div className="relative w-12 h-12 md:w-14 md:h-14">
          <Image
            src="/image/Reeltime Icon.png"
            alt="ReelTime Media"
            fill
            className="object-contain group-hover:scale-105 transition-transform"
            priority
            sizes="56px"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xl md:text-2xl font-bold tracking-tight">
            <span className="text-black">Reel</span>
            <span className="gradient-text">Time</span>
          </span>
          <span className="text-[10px] md:text-xs text-[#B3B3B3] tracking-[0.2em] uppercase">Media</span>
        </div>
      </Link>

      <div className="hidden lg:flex items-center gap-1 bg-gray-100/80 rounded-full px-2 py-1 backdrop-blur-sm border border-gray-200/70">
        <Link href="/home" className="px-5 py-2.5 text-sm font-medium text-gray-900 hover:text-[#E31837] transition-colors rounded-full hover:bg-gray-100">
          {t('home')}
        </Link>
        <Link href="/browse" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
          {t('browse')}
        </Link>
        <Link href="/movies" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
          {t('movies')}
        </Link>
        <Link href="/series" className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100">
          {t('series')}
        </Link>
      </div>
    </>
  );
}
