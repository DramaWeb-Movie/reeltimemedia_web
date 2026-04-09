'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { FiAlertCircle, FiRefreshCw, FiHome } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

function FailedContent() {
  const t = useTranslations('payment');
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const cancelToken = searchParams.get('cancel_token');
  const contentId = searchParams.get('id');

  useEffect(() => {
    if (!orderId || !cancelToken) return;
    fetch('/api/payments/baray/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, cancel_token: cancelToken }),
    }).catch(() => {});
  }, [cancelToken, orderId]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="text-5xl text-brand-red" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('failed')}</h2>
          <p className="text-gray-500 mb-2">
            {t('notCompleted')}
          </p>

          {orderId && (
            <p className="text-gray-400 text-sm mb-6">
              Order ID: <span className="font-mono text-gray-500">{orderId}</span>
            </p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {t('whatHappened')}
            </h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center gap-2">
                <FiAlertCircle className="text-brand-red shrink-0" />
                {t('cancelledOrDeclined')}
              </li>
              <li className="flex items-center gap-2">
                <FiAlertCircle className="text-brand-red shrink-0" />
                {t('noCharges')}
              </li>
              <li className="flex items-center gap-2">
                <FiAlertCircle className="text-brand-red shrink-0" />
                {t('recordSaved')}
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {contentId ? (
              <Link href={`/drama/${contentId}`}>
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FiRefreshCw className="text-lg" /> {t('tryAgain')}
                </Button>
              </Link>
            ) : (
              <Link href="/movies">
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                  <FiRefreshCw className="text-lg" /> {t('tryAgain')}
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
            {t('needHelp')}{' '}
            <a href="/support" className="text-brand-red hover:underline">
              {t('contactSupport')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full" />
      </div>
    }>
      <FailedContent />
    </Suspense>
  );
}
