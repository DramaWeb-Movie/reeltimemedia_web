'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { FiCheck, FiPlay, FiHome, FiFilm, FiClock } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

function SuccessContent() {
  const t = useTranslations('payment');
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const contentId = searchParams.get('id');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-4">
              <FiClock className="text-4xl text-brand-red animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('confirming')}</h2>
            <p className="text-gray-500 mb-6">
              {t('pleaseWait')}
            </p>
            <div className="animate-spin w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <FiCheck className="text-5xl text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('successful')}</h2>
          <p className="text-gray-500 mb-2">
            {t('thankYou')}
          </p>

          {orderId && (
            <p className="text-gray-400 text-sm mb-6">
              Order ID: <span className="font-mono text-gray-500">{orderId}</span>
            </p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t('whatsNext')}
            </h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <FiCheck className="text-green-600 shrink-0" />
                {t('contentAvailable')}
              </li>
              <li className="flex items-center gap-2">
                <FiCheck className="text-green-600 shrink-0" />
                {t('accessLinked')}
              </li>
              <li className="flex items-center gap-2">
                <FiCheck className="text-green-600 shrink-0" />
                {t('receiptSent')}
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {contentId ? (
              <Link href={`/drama/${contentId}/watch`}>
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FiPlay className="text-lg" /> {t('watchNow')}
                </Button>
              </Link>
            ) : (
              <Link href="/browse">
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FiFilm className="text-lg" /> {t('browseContent')}
                </Button>
              </Link>
            )}
            <Link href="/home">
              <Button variant="outline" className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <FiHome className="text-lg" /> {t('backToHome')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {t('havingIssues')}{' '}
            <a href="/support" className="text-brand-red hover:underline">
              {t('supportTeam')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
