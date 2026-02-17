'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { FiDollarSign, FiCreditCard } from 'react-icons/fi';

interface PaymentButtonProps {
  contentType: 'movie' | 'subscription';
  contentId?: string;
  contentTitle: string;
  amount: number;
  currency?: 'USD' | 'KHR';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  children?: React.ReactNode;
  icon?: boolean;
}

/**
 * PaymentButton Component
 * 
 * A reusable button component that redirects to the KHQR payment page
 * with pre-filled payment details.
 * 
 * @example
 * // For a movie purchase
 * <PaymentButton
 *   contentType="movie"
 *   contentId="movie-123"
 *   contentTitle="Awesome Movie"
 *   amount={4.99}
 *   currency="USD"
 * >
 *   Buy Now - $4.99
 * </PaymentButton>
 * 
 * @example
 * // For a subscription
 * <PaymentButton
 *   contentType="subscription"
 *   contentTitle="Series Subscription"
 *   amount={9.99}
 * >
 *   Subscribe - $9.99/month
 * </PaymentButton>
 */
export default function PaymentButton({
  contentType,
  contentId,
  contentTitle,
  amount,
  currency = 'USD',
  variant = 'primary',
  className = '',
  children,
  icon = true,
}: PaymentButtonProps) {
  const router = useRouter();

  const handlePayment = () => {
    // Build payment URL with query parameters
    const params = new URLSearchParams({
      type: contentType,
      title: contentTitle,
      amount: amount.toString(),
      currency: currency,
    });

    if (contentId) {
      params.set('id', contentId);
    }

    router.push(`/payment?${params.toString()}`);
  };

  return (
    <Button
      variant={variant}
      onClick={handlePayment}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      {icon && (contentType === 'subscription' ? (
        <FiCreditCard className="text-lg" />
      ) : (
        <FiDollarSign className="text-lg" />
      ))}
      {children || `Pay ${currency === 'KHR' ? `${(amount * 4100).toFixed(0)} KHR` : `$${amount.toFixed(2)}`}`}
    </Button>
  );
}
