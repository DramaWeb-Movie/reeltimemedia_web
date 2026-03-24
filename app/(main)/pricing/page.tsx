import Link from 'next/link';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';
import { FiDollarSign, FiCheck, FiPlay } from 'react-icons/fi';
import { getTranslations } from 'next-intl/server';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  billing_period: string;
  description: string | null;
}

async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, price, currency, billing_period, description')
    .order('price', { ascending: true });

  if (error) {
    console.error('Failed to fetch subscription plans:', error);
    return [];
  }
  return data ?? [];
}

export default async function PricingPage() {
  const plans = await getSubscriptionPlans();
  const t = await getTranslations('pricing');

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {plans.length === 0 ? (
          <div className="max-w-lg mx-auto text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-10">
            <p className="text-gray-900 font-medium mb-2">{t('noPlans')}</p>
            <p className="text-gray-500 text-sm mb-6">{t('noPlansHint')}</p>
            <Link href="/series">
              <Button className="inline-flex items-center justify-center gap-2">
                <FiPlay className="text-lg" /> {t('browseSeries')}
              </Button>
            </Link>
          </div>
        ) : (
          <div
            className={`grid gap-8 max-w-5xl mx-auto ${
              plans.length === 1 ? 'max-w-sm' : plans.length === 2 ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3'
            }`}
          >
            {plans.map((plan, idx) => {
              const isPopular = idx === 0;
              const price = parseFloat(plan.price);
              const paymentUrl = `/payment?type=subscription&id=${plan.id}&amount=${price}&title=${encodeURIComponent(plan.name)}&currency=${plan.currency}`;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl overflow-hidden flex flex-col relative shadow-sm ${
                    isPopular ? 'border-2 border-[#E31837]/50' : 'border border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-[#E31837] text-white text-xs font-semibold px-4 py-1.5 rounded-bl-xl">
                      {t('popular')}
                    </div>
                  )}
                  <div className="p-6 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-[#E31837]/10 flex items-center justify-center mb-4">
                      <FiPlay className="text-2xl text-[#E31837]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}{' '}
                      <span className="text-sm font-normal text-gray-400 capitalize">({plan.billing_period})</span>
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {plan.description ?? t('fallbackDesc')}
                    </p>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-[#E31837]">
                        {plan.currency === 'USD' ? '$' : plan.currency}
                        {price.toFixed(2)}
                      </span>
                      <span className="text-gray-400">/{plan.billing_period}</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">
                      {t('billedPeriod', { period: plan.billing_period })}
                    </p>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center gap-2 text-gray-600 text-sm">
                        <FiCheck className="text-[#E31837] shrink-0" /> {t('allSeries')}
                      </li>
                      <li className="flex items-center gap-2 text-gray-600 text-sm">
                        <FiCheck className="text-[#E31837] shrink-0" /> {t('newEpisodes')}
                      </li>
                      <li className="flex items-center gap-2 text-gray-600 text-sm">
                        <FiCheck className="text-[#E31837] shrink-0" /> {t('cancelAnytime')}
                      </li>
                    </ul>
                    <Link href={paymentUrl} className="mt-auto">
                      <Button className="w-full flex items-center justify-center gap-2">
                        <FiDollarSign className="text-lg" /> {t('subscribeNow')}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-gray-400 text-sm mt-10">
          {t('disclaimer')}
        </p>
      </div>
    </div>
  );
}
