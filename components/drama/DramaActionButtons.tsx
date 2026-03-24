'use client';

import Link from 'next/link';
import { FiPlay, FiDollarSign } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import type { Drama } from '@/types';

interface DramaActionButtonsProps {
  id: string;
  drama: Pick<Drama, 'title' | 'contentType' | 'price' | 'monthlyPrice'>;
  isFreeMovie: boolean;
  hasPurchasedMovie: boolean;
  /**
   * hero    — inline-flex buttons sized for the banner area (desktop)
   * compact — full-width block buttons for mobile poster / sidebar
   */
  variant?: 'hero' | 'compact';
}

const STYLES = {
  hero: {
    primary:
      'gradient-btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg',
    secondary:
      'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors',
  },
  compact: {
    primary: 'gradient-btn block w-full text-center py-3 rounded-xl font-semibold text-white',
    secondary:
      'block w-full text-center py-3 rounded-xl font-semibold border-2 border-[#E31837] text-[#E31837] hover:bg-[#E31837]/5 transition-colors',
  },
} as const;

function ButtonContent({
  icon: Icon,
  label,
  isHero,
}: {
  icon: React.ElementType;
  label: string;
  isHero: boolean;
}) {
  if (isHero) {
    return (
      <>
        <Icon className="text-lg" />
        {label}
      </>
    );
  }
  return (
    <span className="flex items-center justify-center gap-2">
      <Icon />
      {label}
    </span>
  );
}

export default function DramaActionButtons({
  id,
  drama,
  isFreeMovie,
  hasPurchasedMovie,
  variant = 'compact',
}: DramaActionButtonsProps) {
  const tWatch = useTranslations('watch');
  const tDrama = useTranslations('drama');
  const isHero = variant === 'hero';
  const { primary, secondary } = STYLES[variant];
  const encodedTitle = encodeURIComponent(drama.title);

  if (isFreeMovie) {
    return (
      <Link href={`/drama/${id}/watch`} className={primary}>
        <ButtonContent icon={FiPlay} label={tWatch('watchNow')} isHero={isHero} />
      </Link>
    );
  }

  if (drama.contentType === 'movie' && drama.price != null && drama.price > 0) {
    return hasPurchasedMovie ? (
      <Link href={`/drama/${id}/watch`} className={primary}>
        <ButtonContent icon={FiPlay} label={tDrama('watch')} isHero={isHero} />
      </Link>
    ) : (
      <Link
        href={`/payment?type=movie&id=${id}&amount=${drama.price}&title=${encodedTitle}`}
        className={primary}
      >
        <ButtonContent
          icon={FiDollarSign}
          label={tDrama('buyFor', { price: `$${drama.price.toFixed(2)}` })}
          isHero={isHero}
        />
      </Link>
    );
  }

  if (drama.contentType === 'series') {
    return (
      <>
        <Link href={`/drama/${id}/watch?ep=1`} className={primary}>
          <ButtonContent icon={FiPlay} label={tDrama('watch')} isHero={isHero} />
        </Link>
        {drama.monthlyPrice != null && (
          <Link
            href={`/payment?type=subscription&id=${id}&amount=${drama.monthlyPrice}&title=${encodedTitle}`}
            className={secondary}
          >
            {isHero ? (
              <>
                <FiDollarSign className="text-lg" />
                {tDrama('subscribePerMonth', { price: `$${drama.monthlyPrice.toFixed(2)}` })}
              </>
            ) : (
              tDrama('subscribePerMonth', { price: `$${drama.monthlyPrice.toFixed(2)}` })
            )}
          </Link>
        )}
      </>
    );
  }

  return (
    <Link href={`/drama/${id}/watch`} className={primary}>
      <ButtonContent icon={FiPlay} label={tWatch('watchNow')} isHero={isHero} />
    </Link>
  );
}
