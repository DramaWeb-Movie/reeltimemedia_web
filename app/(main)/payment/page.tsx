'use client';

import { useId, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { FiArrowLeft, FiSmartphone, FiDollarSign, FiFilm, FiCheck, FiPlay, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import KHQRCard from '@/components/payment/KHQRCard';

function PaymentContent() {
  const searchParams = useSearchParams();
  const stableId = useId().replace(/:/g, '');
  const type = searchParams.get('type') || 'movie';
  const id = searchParams.get('id') || '';
  const amount = Math.max(0, Number(searchParams.get('amount')) || 4.99);
  const title = searchParams.get('title') || (type === 'subscription' ? 'Series subscription' : 'Movie purchase');
  const currency = (searchParams.get('currency') || 'USD').toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed'>('pending');
  const [checking, setChecking] = useState(false);

  const isSubscription = type === 'subscription';
  const displayAmount = currency === 'KHR' ? (amount * 4100).toFixed(0) : amount.toFixed(2);
  const paymentAmount = currency === 'KHR' ? amount * 4100 : amount;

  // Generate QR code on mount
  useEffect(() => {
    generateQRCode();
  }, []);

  // Poll payment status every 5 seconds
  useEffect(() => {
    if (!qrData?.payment_id || paymentStatus !== 'pending') return;

    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [qrData, paymentStatus]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/generate-qr', {
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
        throw new Error(result.error?.message || 'Failed to generate QR code');
      }

      setQrData(result.data);
    } catch (err: any) {
      console.error('QR generation error:', err);
      setError(err.message || 'Failed to generate payment QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!qrData?.payment_id || checking) return;

    try {
      setChecking(true);

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: qrData.payment_id,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.status === 'completed') {
        setPaymentStatus('completed');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
    } finally {
      setChecking(false);
    }
  };

  // Show success state
  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen bg-[#0F0F0F] pt-24">
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <FiCheck className="text-4xl text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-[#B3B3B3] mb-6">
              Your payment has been confirmed. You now have access to {title}.
            </p>
            <Link href={id ? `/drama/${id}/watch` : '/browse'}>
              <Button className="flex items-center justify-center gap-2 mx-auto">
                <FiPlay className="text-lg" /> {id ? 'Watch Now' : 'Browse Content'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-2xl">
        <Link
          href={id ? `/drama/${id}` : '/movies'}
          className="inline-flex items-center gap-2 text-[#B3B3B3] hover:text-[#E31837] transition-colors text-sm font-medium mb-8"
        >
          <FiArrowLeft className="text-lg" /> Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Pay with KHQR</h1>
        <p className="text-[#808080] text-sm mb-8">
          Scan the QR code with any KHQR-supported app to complete payment.
        </p>

        <div className="space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-8 text-center">
              <div className="animate-spin w-12 h-12 border-2 border-[#E31837] border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-[#B3B3B3]">Generating payment QR code...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-red-500/50 p-6">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="text-red-500 text-xl shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-1">Payment Error</h3>
                  <p className="text-[#B3B3B3] text-sm mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={generateQRCode}
                    className="flex items-center gap-2"
                  >
                    <FiRefreshCw className="text-lg" /> Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Order summary */}
          {qrData && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FiFilm className="text-[#E31837]" /> Order summary
              </h2>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-white font-medium">{title}</p>
                  <p className="text-[#808080] text-sm mt-0.5">
                    {isSubscription ? 'Monthly subscription' : 'Single movie (buy)'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-[#E31837]">
                    {currency === 'KHR' ? `${displayAmount} KHR` : `$${displayAmount}`}
                  </p>
                  <p className="text-[#808080] text-xs mt-0.5">Ref: {qrData.reference}</p>
                </div>
              </div>
            </div>
          )}

          {/* KHQR Payment Card - Styled like official KHQR */}
          {qrData && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-8 flex flex-col items-center">
              {/* Official KHQR-styled card */}
              <KHQRCard
                qrData={qrData.qr_data}
                amount={paymentAmount}
                currency={currency as 'USD' | 'KHR'}
                merchantName="ReelTime Media"
                merchantCity="Phnom Penh"
                reference={qrData.reference}
                imageUrl={qrData.image_url} // If KHQR API returns styled image
              />
              
              {/* Payment status indicator */}
              <div className="mt-6 flex items-center gap-2">
                {checking && (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-[#E31837] border-t-transparent rounded-full" />
                    <span className="text-[#808080] text-sm">Checking payment status...</span>
                  </>
                )}
                {!checking && paymentStatus === 'pending' && (
                  <>
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-[#808080] text-sm">Waiting for payment</span>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                onClick={checkPaymentStatus}
                disabled={checking}
                className="mt-6 w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <FiRefreshCw className={`text-lg ${checking ? 'animate-spin' : ''}`} />
                Check Payment Status
              </Button>
            </div>
          )}

          {/* Instructions */}
          {qrData && (
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333]/50 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FiSmartphone className="text-[#E31837]" /> How to pay
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                  <FiCheck className="text-[#E31837] shrink-0 mt-0.5" />
                  Open your bank or e-wallet app (ABA, ACLEDA, Wing, PiPay, etc.)
                </li>
                <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                  <FiCheck className="text-[#E31837] shrink-0 mt-0.5" />
                  Select Scan / Pay with KHQR and scan this QR code
                </li>
                <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                  <FiCheck className="text-[#E31837] shrink-0 mt-0.5" />
                  Confirm the amount and complete the payment
                </li>
                <li className="flex items-start gap-3 text-[#B3B3B3] text-sm">
                  <FiCheck className="text-[#E31837] shrink-0 mt-0.5" />
                  Your access will be activated automatically once payment is confirmed
                </li>
              </ul>
            </div>
          )}

          <p className="text-[#808080] text-xs text-center">
            Payment powered by KHQR - Cambodia's national QR payment standard managed by the National Bank of Cambodia.
          </p>
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
