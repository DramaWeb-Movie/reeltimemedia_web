'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { FiArrowLeft, FiCreditCard, FiFilm, FiAlertCircle, FiShield, FiCheck } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

/** Approximate USD → KHR conversion rate used for display purposes only */
const KHR_RATE = 4100;

function PaymentContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'movie';
  const id = searchParams.get('id') || '';
  const rawAmount = Number(searchParams.get('amount'));
  const amount = rawAmount > 0 ? rawAmount : 0;
  const title = searchParams.get('title') || (type === 'subscription' ? 'Series subscription' : 'Movie purchase');
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
      setError('You need to sign in before making a payment.');
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
        throw new Error(result.error?.message || 'Failed to create payment');
      }

      // Redirect to Baray payment page
      if (result.data?.payment_url) {
        window.location.href = result.data.payment_url;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
        <Link
          href={id ? `/drama/${id}` : '/movies'}
          className="inline-flex items-center gap-2 text-[#B3B3B3] hover:text-[#E31837] transition-colors text-sm font-medium mb-8"
        >
          <FiArrowLeft className="text-lg" /> Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Complete Your Purchase</h1>
        <p className="text-[#808080] text-sm mb-8">
          Secure payment via Cambodian banks (ABA, ACLEDA, Sathapana, Wing)
        </p>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiFilm className="text-[#E31837]" /> Order Summary
            </h2>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-white font-medium">{title}</p>
                <p className="text-[#808080] text-sm mt-0.5">
                  {isSubscription ? 'Monthly subscription' : 'One-time purchase'}
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
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiCreditCard className="text-[#E31837]" /> Payment Methods
            </h2>
            <p className="text-[#B3B3B3] text-sm mb-4">
              You'll be redirected to our secure payment page where you can choose from:
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#0F0F0F] rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#1e3a8a] rounded flex items-center justify-center text-white text-xs font-bold">
                  ABA
                </div>
                <span className="text-[#B3B3B3] text-sm">ABA Bank</span>
              </div>
              <div className="bg-[#0F0F0F] rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00843D] rounded flex items-center justify-center text-white text-xs font-bold">
                  ACL
                </div>
                <span className="text-[#B3B3B3] text-sm">ACLEDA</span>
              </div>
              <div className="bg-[#0F0F0F] rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#e11d48] rounded flex items-center justify-center text-white text-xs font-bold">
                  SPN
                </div>
                <span className="text-[#B3B3B3] text-sm">Sathapana</span>
              </div>
              <div className="bg-[#0F0F0F] rounded-lg p-3 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#f97316] rounded flex items-center justify-center text-white text-xs font-bold">
                  W
                </div>
                <span className="text-[#B3B3B3] text-sm">Wing</span>
              </div>
            </div>
            <p className="text-[#666666] text-xs">
              Supports KHQR, Mobile Banking Deeplinks, and Card payments (via ABA)
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-xl shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-semibold mb-1">Payment Error</h3>
                <p className="text-[#B3B3B3] text-sm">{error}</p>
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
                  Redirecting to payment...
                </>
              ) : (
                <>
                  <FiCreditCard className="text-xl" />
                  Pay {currency === 'KHR' ? `${displayAmount} KHR` : `$${displayAmount}`}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#1A1A1A] border border-[#333333]/60 rounded-xl p-4 text-center">
                <p className="text-white font-semibold mb-1">Sign in to continue</p>
                <p className="text-[#B3B3B3] text-sm">
                  You need an account to purchase and keep access to this content.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={`/login?redirect=/payment?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&amount=${encodeURIComponent(String(amount))}&title=${encodeURIComponent(title)}&currency=${encodeURIComponent(currency)}`}>
                  <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                    Sign in to pay
                  </Button>
                </Link>
                <Link href={`/register?redirect=/payment?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&amount=${encodeURIComponent(String(amount))}&title=${encodeURIComponent(title)}&currency=${encodeURIComponent(currency)}`}>
                  <Button variant="outline" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    Create account
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-center justify-center gap-2 text-[#666666] text-xs">
            <FiShield className="text-green-500" />
            <span>Secure payment processed by licensed Cambodian banks</span>
          </div>

          {/* How It Works */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-6">
            <h2 className="text-lg font-bold text-white mb-4">How It Works</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">1</span>
                </div>
                Click "Pay" to go to the secure payment page
              </li>
              <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">2</span>
                </div>
                Select your preferred bank or payment method
              </li>
              <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                <div className="w-6 h-6 rounded-full bg-[#E31837]/20 flex items-center justify-center shrink-0">
                  <span className="text-[#E31837] text-xs font-bold">3</span>
                </div>
                Scan QR code or complete payment in your banking app
              </li>
              <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <FiCheck className="text-green-500 text-xs" />
                </div>
                Get instant access to your content
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
      <div className="min-h-screen bg-[#0F0F0F] pt-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
