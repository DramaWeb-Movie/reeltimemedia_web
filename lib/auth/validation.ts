import { isValidE164, normalizePhone } from '@/lib/auth/phone';

type Translate = (key: string) => string;

export function validateName(name: string, t: Translate): string | undefined {
  if (!name.trim()) return t('nameRequired');
  if (name.length < 2) return t('nameMinLength');
  return undefined;
}

export function validateEmail(email: string, t: Translate): string | undefined {
  if (!email) return t('emailRequired');
  if (!/\S+@\S+\.\S+/.test(email)) return t('emailInvalid');
  return undefined;
}

export function validatePhone(phone: string, t: Translate): string | undefined {
  const normalized = normalizePhone(phone);
  if (!phone.trim()) return t('phoneRequired');
  if (!isValidE164(normalized)) return t('phoneInvalid');
  return undefined;
}

export function validatePassword(password: string, t: Translate): string | undefined {
  if (!password) return t('passwordRequired');
  if (password.length < 6) return t('passwordMinLength');
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
  t: Translate
): string | undefined {
  if (!confirmPassword) return t('confirmPasswordRequired');
  if (password !== confirmPassword) return t('passwordsDoNotMatch');
  return undefined;
}
