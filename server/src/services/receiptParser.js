'use strict';

/**
 * Receipt metadata extraction.
 *
 * This is a deterministic filename parser, not OCR. It is deliberately honest
 * about what it does: when a file arrives as `2026-01-14-starbucks-12.50.jpg`
 * we can confidently record the vendor and the total. Anything less obvious
 * yields an empty result rather than invented data.
 *
 * (An OCR stage can be slotted in behind this same interface later — the
 * controller only depends on the shape returned here.)
 */

const AMOUNT_PATTERN = /(?:\$|usd|inr|eur|£|₹)?\s?(\d{1,7}(?:[.,]\d{2}))(?:\s?(?:usd|inr|eur))?/i;
const DATE_PATTERNS = [/\b(\d{4})[-_.](\d{2})[-_.](\d{2})\b/, /\b(\d{2})[-_.](\d{2})[-_.](\d{4})\b/];

const NOISE_WORDS = new Set([
  'receipt',
  'invoice',
  'scan',
  'scanned',
  'img',
  'image',
  'photo',
  'document',
  'doc',
  'copy',
  'final',
  'total',
  'amount',
  'amt',
  'sum',
  'due',
  'paid',
  'pdf',
  'jpeg',
  'jpg',
  'png',
  'webp',
  'heic',
  'upload',
]);

/** Normalise `12,50` and `12.50` to exactly two decimals. */
function normaliseAmount(raw) {
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

function extractDate(text) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const [, a, b, c] = match;
    // YYYY-MM-DD
    if (a.length === 4) {
      const date = new Date(Date.UTC(Number(a), Number(b) - 1, Number(c)));
      if (!Number.isNaN(date.getTime())) return date;
    } else {
      // DD-MM-YYYY (day-first: the common convention outside the US)
      const date = new Date(Date.UTC(Number(c), Number(b) - 1, Number(a)));
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * @param {string} originalName file name as uploaded
 * @returns {{ vendor: string|null, totalCents: number|null, occurredOn: Date|null, confidence: 'high'|'low' }}
 */
function parseReceiptName(originalName = '') {
  const withoutExtension = originalName.replace(/\.[a-z0-9]+$/i, '');
  const normalised = withoutExtension.replace(/[_+]+/g, '-').replace(/\s+/g, '-');

  const amountMatch = normalised.match(AMOUNT_PATTERN);
  const totalCents = amountMatch ? normaliseAmount(amountMatch[1]) : null;
  const occurredOn = extractDate(normalised);

  const vendorTokens = normalised
    .replace(AMOUNT_PATTERN, ' ')
    .replace(/\d{4}[-_.]?\d{2}[-_.]?\d{2}/g, ' ')
    .replace(/\d{2}[-_.]?\d{2}[-_.]?\d{4}/g, ' ')
    .split(/[-_\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !NOISE_WORDS.has(token.toLowerCase()) && !/^\d+$/.test(token));

  const vendor = vendorTokens.length
    ? vendorTokens
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(' ')
    : null;

  return {
    vendor,
    totalCents,
    occurredOn,
    confidence: totalCents !== null && vendor !== null ? 'high' : 'low',
  };
}

module.exports = { parseReceiptName };
