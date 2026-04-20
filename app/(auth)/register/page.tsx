'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FiMail, FiLock, FiUser, FiPhone } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicConfigError } from '@/lib/supabase/publicConfig';
import { normalizePhone } from '@/lib/auth/phone';
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '@/lib/auth/validation';
import { useTranslations } from 'next-intl';

type RegisterMethod = 'email' | 'phone';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('phone');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const nameError = validateName(formData.name, t);
    if (nameError) newErrors.name = nameError;

    if (registerMethod === 'email') {
      const emailError = validateEmail(formData.email, t);
      if (emailError) newErrors.email = emailError;
    } else {
      const phoneError = validatePhone(formData.phone, t);
      if (phoneError) newErrors.phone = phoneError;
    }

    const passwordError = validatePassword(formData.password, t);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword, t);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) {
      setFormError(t('fixErrors'));
      return;
    }

    if (!agreeToTerms) {
      setFormError(t('agreeToTermsError'));
      return;
    }

    setLoading(true);
    setFormError(null);

    const configError = getSupabasePublicConfigError();
    if (configError) {
      setFormError(configError);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const payload =
        registerMethod === 'email'
          ? {
              email: formData.email,
              password: formData.password,
              options: { data: { full_name: formData.name } },
            }
          : {
              phone: normalizePhone(formData.phone),
              password: formData.password,
              options: { data: { full_name: formData.name } },
            };

      const { data, error } = await supabase.auth.signUp(payload);

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.user && !data.user.confirmed_at) {
        const message =
          registerMethod === 'email'
            ? 'Check your email to confirm your account'
            : 'Check your phone for a code to confirm your account';
        router.push('/login?message=' + encodeURIComponent(message));
        return;
      }

      router.push('/home');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
    >
      {formError && (
        <div className="mb-4 p-4 rounded-xl bg-brand-red/20 border border-brand-red text-brand-red text-sm">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email / Phone toggle */}
        <div className="flex rounded-xl bg-[#252525] border border-[#333333] p-1">
          <button
            type="button"
            onClick={() => setRegisterMethod('email')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              registerMethod === 'email' ? 'bg-brand-red text-white' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            {t('registerWithEmail')}
          </button>
          <button
            type="button"
            onClick={() => setRegisterMethod('phone')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              registerMethod === 'phone' ? 'bg-brand-red text-white' : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            {t('registerWithPhone')}
          </button>
        </div>

        {/* Name Input */}
        <div className="relative">
          <FiUser className="absolute left-4 top-[46px] text-[#808080]" />
          <Input
            label={t('fullName')}
            type="text"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            value={formData.name}
            onChange={handleChange}
            placeholder={t('enterFullName')}
            error={errors.name}
            className="pl-11"
          />
        </div>

        {/* Email or Phone Input */}
        {registerMethod === 'email' ? (
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
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t('createPassword')}
            error={errors.password}
            className="pl-11"
          />
        </div>

        {/* Confirm Password Input */}
        <div className="relative">
          <FiLock className="absolute left-4 top-[46px] text-[#808080]" />
          <Input
            label={t('confirmPassword')}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder={t('confirmYourPassword')}
            error={errors.confirmPassword}
            className="pl-11"
          />
        </div>

        {/* Terms Agreement */}
        <label className="flex items-start gap-3 cursor-pointer select-none py-1">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            className="h-5 w-5 mt-0.5 text-brand-red bg-white border-gray-300 rounded focus:ring-brand-red shrink-0"
          />
          <span className="text-sm text-gray-600">
            {t('agreeToTerms')}{' '}
            <Link href="/terms" className="text-brand-red hover:text-brand-red/80 font-medium transition-colors">
              {t('termsOfService')}
            </Link>{' '}
            {t('and')}{' '}
            <Link href="/privacy" className="text-brand-red hover:text-brand-red/80 font-medium transition-colors">
              {t('privacyPolicy')}
            </Link>
          </span>
        </label>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={loading}
        >
          {loading ? t('creatingAccount') : t('createAccount')}
        </Button>

        {/* Sign In Link */}
        <p className="text-center text-sm text-[#B3B3B3]">
          {t('alreadyHaveAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-brand-red hover:text-brand-red/80 transition-colors"
          >
            {t('signIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

