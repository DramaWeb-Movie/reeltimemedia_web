'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FiMail, FiLock, FiPhone } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicConfigError } from '@/lib/supabase/publicConfig';
import { normalizePhone } from '@/lib/auth/phone';
import { validateEmail, validatePassword, validatePhone } from '@/lib/auth/validation';
import { useTranslations } from 'next-intl';

type LoginMethod = 'email' | 'phone';

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) setSuccessMessage(decodeURIComponent(message));
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; phone?: string; password?: string } = {};

    if (loginMethod === 'email') {
      const emailError = validateEmail(formData.email, t);
      if (emailError) newErrors.email = emailError;
    } else {
      const phoneError = validatePhone(formData.phone, t);
      if (phoneError) newErrors.phone = phoneError;
    }

    const passwordError = validatePassword(formData.password, t);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    const configError = getSupabasePublicConfigError();
    if (configError) {
      setErrors({ [loginMethod === 'email' ? 'email' : 'phone']: configError });
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const credentials =
        loginMethod === 'email'
          ? { email: formData.email, password: formData.password }
          : { phone: normalizePhone(formData.phone), password: formData.password };

      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        setErrors({ [loginMethod === 'email' ? 'email' : 'phone']: error.message });
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setErrors({ [loginMethod === 'email' ? 'email' : 'phone']: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
    >
      {successMessage && (
        <div className="p-4 mb-6 rounded-xl bg-[#1a3d1a] border border-[#2d5a2d] text-[#86ef86] text-sm">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email / Phone toggle */}
        <div className="flex rounded-xl bg-[#252525] border border-[#333333] p-1">
          <button
            type="button"
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              loginMethod === 'email' ? 'bg-brand-red text-white' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            {t('signInWithEmail')}
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              loginMethod === 'phone' ? 'bg-brand-red text-white' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            {t('signInWithPhone')}
          </button>
        </div>

        {/* Email or Phone Input */}
        {loginMethod === 'email' ? (
          <div className="relative">
            <FiMail className="absolute left-4 top-[46px] text-[#808080]" />
            <Input
              label={t('emailAddress')}
              type="email"
              name="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('enterEmail')}
              error={errors.email}
              className="pl-11"
            />
          </div>
        ) : (
          <div className="relative">
            <FiPhone className="absolute left-4 top-[46px] text-[#808080]" />
            <Input
              label={t('phoneNumber')}
              type="tel"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('enterPhone')}
              error={errors.phone}
              className="pl-11"
            />
          </div>
        )}

        {/* Password Input */}
        <div className="relative">
          <FiLock className="absolute left-4 top-[46px] text-[#808080]" />
          <Input
            label={t('password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t('enterPassword')}
            error={errors.password}
            className="pl-11"
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center cursor-pointer py-1 -my-1 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 text-brand-red bg-white border-gray-300 rounded focus:ring-brand-red"
            />
            <span className="ml-2.5 text-sm text-gray-700">{t('rememberMe')}</span>
          </label>

          <Link
            href="/forgot-password"
            className="text-sm text-brand-red hover:text-brand-red/80 font-medium transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? t('signingIn') : t('signIn')}
        </Button>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-[#B3B3B3]">
          {t('dontHaveAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-brand-red hover:text-brand-red/80 transition-colors"
          >
            {t('signUp')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="Welcome Back" subtitle="Sign in to continue streaming">
        <div className="animate-pulse space-y-6">
          <div className="h-14 bg-[#252525] rounded-xl" />
          <div className="h-14 bg-[#252525] rounded-xl" />
          <div className="h-12 bg-[#252525] rounded-xl" />
        </div>
      </AuthLayout>
    }>
      <LoginForm />
    </Suspense>
  );
}

