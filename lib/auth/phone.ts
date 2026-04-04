/** Normalize to E.164 (default +855 for Cambodian numbers) */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('855') && digits.length >= 9) return '+' + digits;
  if (digits.startsWith('0') && digits.length >= 9) return '+855' + digits.slice(1);
  if (digits.length >= 8 && digits.length <= 9) return '+855' + digits;
  return '+' + digits;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{8,14}$/.test(phone);
}
