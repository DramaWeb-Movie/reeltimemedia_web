'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { FiArrowLeft, FiCreditCard, FiFilm, FiAlertCircle, FiShield, FiCheck } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

/** Approximate USD → KHR conversion rate used for display purposes only */
const KHR_RATE = 4100;

const PAYMENT_METHOD_LOGOS = [
  { src: '/bank_logo/aba.png', labelKey: 'checkout.bankAba', altKey: 'checkout.bankAbaAlt' },
  { src: '/bank_logo/acelida.png', labelKey: 'checkout.bankAcleda', altKey: 'checkout.bankAcledaAlt' },
  { src: '/bank_logo/sathapana.png', labelKey: 'checkout.bankSathapana', altKey: 'checkout.bankSathapanaAlt' },
  { src: '/bank_logo/wing.png', labelKey: 'checkout.bankWing', altKey: 'checkout.bankWingAlt' },
] as const;

function PaymentContent() {
  const t = useTranslations('payment');
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'movie';
  const id = searchParams.get('id') || '';
  const rawAmount = Number(searchParams.get('amount'));
  const amount = rawAmount > 0 ? rawAmount : 0;
  const title =
    searchParams.get('title') ||
    (type === 'subscription' ? t('checkout.defaultSubscription') : t('checkout.defaultMovie'));
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Require login before allowing payment
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch (e) {
        console.error('Auth check failed:', e);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const isSubscription = type === 'subscription';
  const paymentAmount = currency === 'KHR' ? amount * KHR_RATE : amount;
  const displayAmount = currency === 'KHR' ? paymentAmount.toFixed(0) : amount.toFixed(2);

  const handlePayment = async () => {
    if (!isAuthenticated) {
      setError(t('checkout.needSignIn'));
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Create Baray payment intent
      const response = await fetch('/api/payments/baray', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: currency,
          contentType: type,
          contentId: id,
          contentTitle: title,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || t('checkout.failedToCreate'));
      }

      // Redirect to Baray payment page
      if (result.data?.payment_url) {
        window.location.href = result.data.payment_url;
      } else {
        throw new Error(t('checkout.noPaymentUrl'));
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : t('checkout.genericFailure'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
        <Link
          href={id ? `/drama/${id}` : '/movies'}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-[#E31837] transition-colors text-sm font-medium mb-8"
        >
          <FiArrowLeft className="text-lg" /> {t('checkout.back')}
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('checkout.title')}</h1>
        <p className="text-gray-500 text-sm mb-8">
          {t('checkout.subtitle')}
        </p>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiFilm className="text-[#E31837]" /> {t('checkout.orderSummary')}
            </h2>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-gray-900 font-medium">{title}</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  {isSubscription ? t('checkout.monthlySubscription') : t('checkout.oneTimePurchase')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-[#E31837]">
                  {currency === 'KHR' ? `${displayAmount} KHR` : `$${displayAmount}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiCreditCard className="text-[#E31837]" /> {t('checkout.paymentMethods')}
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {t('checkout.redirectHint')}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {PAYMENT_METHOD_LOGOS.map(({ src, labelKey, altKey }) => (
                <div
                  key={src}
                  className="bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center gap-3 min-h-[52px]"
                >
                  <div className="relative h-9 w-9 shrink-0 bg-white rounded-md border border-gray-100 overflow-hidden">
                    <Image
                      src={src}
                      alt={t(altKey)}
                      fill
                      className="object-contain p-0.5"
                      sizes="36px"
                    />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{t(labelKey)}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs">
              {t('checkout.supportsNote')}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <FiAlertCircle className="text-red-600 text-xl shrink-0 mt-0.5" />
              <div>
                <h3 className="text-gray-900 font-semibold mb-1">{t('checkout.paymentError')}</h3>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Auth-aware Pay Button */}
          {isAuthenticated === null ? (
            <div className="w-full py-4 flex items-center justify-center">
              <span className="animate-spin w-6 h-6 border-2 border-[#E31837] border-t-transparent rounded-full" />
            </div>
          ) : isAuthenticated ? (
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 text-lg font-semibold flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  {t('checkout.redirecting')}
                </>
              ) : (
                <>
                  <FiCreditCard className="text-xl" />
                  {t('checkout.pay', {
                    amount: currency === 'KHR' ? `${displayAmount} KHR` : `$${displayAmount}`,
                  })}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-gray-900 font-semibold mb-1">{t('checkout.signInTitle')}</p>
                <p className="text-gray-600 text-sm">
                  {t('checkout.signInDesc')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={`/login?redirect=/payment?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&amount=${encodeURIComponent(String(amount))}&title=${encodeURIComponent(title)}&currency=${encodeURIComponent(currency)}`}>
                  <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                    {t('checkout.signInToPay')}
                  </Button>
                </Link>
                <Link href={`/register?redirect=/payment?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&amount=${encodeURIComponent(String(amount))}&title=${encodeURIComponent(title)}&currency=${encodeURIComponent(currency)}`}>
                  <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    {t('checkout.createAccount')}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <FiShield className="text-green-600" />
            <span>{t('checkout.secureNote')}</span>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('checkout.howItWorks')}</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-600 text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">1</span>
                </div>
                {t('checkout.step1')}
              </li>
              <li className="flex items-start gap-3 text-gray-600 text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">2</span>
                </div>
                {t('checkout.step2')}
              </li>
              <li className="flex items-start gap-3 text-gray-600 text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">3</span>
                </div>
                {t('checkout.step3')}
              </li>
              <li className="flex items-start gap-3 text-gray-600 text-sm">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <FiCheck className="text-green-600 text-xs" />
                </div>
                {t('checkout.step4')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
