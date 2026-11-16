/**
 * Client-side email validation and normalization rules.
 * Mirrors the backend rules defined in backend/src/utils/validators.js.
 */

export const ALLOWED_EMAIL_DOMAIN = 'kiet.edu';

export function normalizeEmail(rawEmail) {  
  if (typeof rawEmail !== 'string') return '';
  return rawEmail
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u0000-\u001F\u007F]/g, '')
    .trim()
    .toLowerCase();
}

export const ALLOWED_ADDITIONAL_EMAILS = ['harshitagrahari33@gmail.com'];

export function isValidKietEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length > 64) return false;

  if (domainPart === ALLOWED_EMAIL_DOMAIN) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized);
  }

  // Explicitly allow harshitagrahari33@gmail.com
  if (ALLOWED_ADDITIONAL_EMAILS.includes(normalized)) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized);
  }

  return false;
}
