const { z } = require('zod');
const mongoose = require('mongoose');

const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'kiet.edu').trim().toLowerCase();
const KIET_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kiet\.edu$/i;

function normalizeEmail(rawEmail) {
  if (typeof rawEmail !== 'string') return '';
  return rawEmail
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u0000-\u001F\u007F]/g, '')
    .trim()
    .toLowerCase();
}

const ALLOWED_ADDITIONAL_EMAILS = [
  'harshitagrahari33@gmail.com',
  ...(process.env.ADDITIONAL_ALLOWED_EMAILS
    ? process.env.ADDITIONAL_ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : []),
];

function isValidKietEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const parts = normalized.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domainPart] = parts;
  if (!localPart || localPart.length > 64) return false;
  if (domainPart === ALLOWED_EMAIL_DOMAIN) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized);
  }

  // Explicitly allow developer and configured test emails
  if (ALLOWED_ADDITIONAL_EMAILS.includes(normalized)) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(normalized);
  }

  return false;
}

function extractCollegeId(email) {
  const normalized = normalizeEmail(email);
  if (!isValidKietEmail(normalized)) return null;
  return normalized.split('@')[0];
}

const isValidObjectId = (val) => mongoose.Types.ObjectId.isValid(val);

const requestOtpSchema = z.object({
  email: z.string().transform(normalizeEmail).refine(isValidKietEmail, {
    message: 'Must be a valid @kiet.edu institutional email address',
  }),
});

const verifyOtpSchema = z.object({
  email: z.string().transform(normalizeEmail).refine(isValidKietEmail, {
    message: 'Must be a valid @kiet.edu institutional email address',
  }),
  otp: z.string().trim().regex(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' }),
  name: z.string().trim().min(2).max(60).optional(),
});

const latitudeSchema = z.preprocess((value) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' })
  .refine((value) => Number.isFinite(value), { message: 'Latitude must be finite' })
  .refine((value) => value >= -90 && value <= 90, { message: 'Latitude must be between -90 and 90' }));

const longitudeSchema = z.preprocess((value) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
}, z.number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' })
  .refine((value) => Number.isFinite(value), { message: 'Longitude must be finite' })
  .refine((value) => value >= -180 && value <= 180, { message: 'Longitude must be between -180 and 180' }));

const createItemSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().trim().min(2, 'Title too short').max(120, 'Title too long'),
  description: z.string().trim().min(5, 'Description too short').max(2000, 'Description too long'),
  category: z.enum([
    'Electronics',
    'Accessories',
    'Documents',
    'Bags',
    'Clothing',
    'Stationery',
    'Keys',
    'Other',
  ]),
  location: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(250).optional().default(''),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  }),
  date: z.string().optional(),
});

const updateItemSchema = createItemSchema.partial();

const matchPreviewSchema = z.object({
  type: z.enum(['lost', 'found']),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().max(2000).default(''),
  category: z.enum([
    'Electronics',
    'Accessories',
    'Documents',
    'Bags',
    'Clothing',
    'Stationery',
    'Keys',
    'Other',
  ]),
  location: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(250).optional().default(''),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  }),
  date: z.string().optional().refine(
    (value) => value === undefined || !Number.isNaN(new Date(value).getTime()),
    { message: 'Date must be valid' }
  ),
});

const createReportSchema = z.object({
  itemId: z.string().refine(isValidObjectId, { message: 'Invalid itemId' }),
  reason: z.enum(['suspicious', 'spam', 'inappropriate', 'fake', 'harassment']),
  description: z.string().trim().max(1000).optional().default(''),
});

const sendMessageSchema = z.object({
  text: z.string().trim().max(2000).optional().default(''),
  attachments: z.array(z.object({
    url: z.string().url(),
    publicId: z.string(),
  })).optional().default([]),
}).refine(data => data.text.length > 0 || (data.attachments && data.attachments.length > 0), {
  message: 'Message cannot be empty without attachments',
});

module.exports = {
  ALLOWED_EMAIL_DOMAIN,
  KIET_EMAIL_REGEX,
  normalizeEmail,
  isValidKietEmail,
  extractCollegeId,
  isValidObjectId,
  requestOtpSchema,
  verifyOtpSchema,
  createItemSchema,
  updateItemSchema,
  matchPreviewSchema,
  createReportSchema,
  sendMessageSchema,
};
