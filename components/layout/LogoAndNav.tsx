import Link from 'next/link';
import Image from 'next/image';
import MainNavLinks from '@/components/layout/MainNavLinks';

export default async function LogoAndNav() {
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

      <MainNavLinks />
    </>
  );
}
