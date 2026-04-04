import Link from 'next/link';
import Image from 'next/image';
import { FiFacebook, FiTwitter, FiInstagram, FiYoutube } from 'react-icons/fi';
import { getTranslations } from 'next-intl/server';

export default async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="bg-gray-100 text-gray-800 mt-auto border-t border-gray-200">
      <div className="container mx-auto px-4 py-5 lg:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 group">
              <div className="relative w-8 h-8">
                <Image
                  src="/image/Reeltime Icon.png"
                  alt="ReelTime Media"
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight">
                  <span className="text-gray-900">Reel</span>
                  <span className="gradient-text">Time</span>
                </span>
                <span className="text-[9px] text-gray-400 tracking-[0.15em] uppercase">Media</span>
              </div>
            </Link>
            <p className="text-gray-500 text-xs leading-snug mb-3 max-w-xs">
              {t('tagline')}
            </p>
            <div className="flex gap-2">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-brand-red hover:text-white transition-all duration-300" aria-label="Facebook">
                <FiFacebook className="text-sm" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-brand-red hover:text-white transition-all duration-300" aria-label="Twitter">
                <FiTwitter className="text-sm" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-brand-red hover:text-white transition-all duration-300" aria-label="Instagram">
                <FiInstagram className="text-sm" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-brand-red hover:text-white transition-all duration-300" aria-label="YouTube">
                <FiYoutube className="text-sm" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-gray-400 text-xs">
              {t('copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-gray-400 hover:text-gray-900 text-xs transition-colors">
                {t('privacyPolicy')}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-gray-900 text-xs transition-colors">
                {t('termsOfService')}
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-gray-900 text-xs transition-colors">
                {t('faq')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
