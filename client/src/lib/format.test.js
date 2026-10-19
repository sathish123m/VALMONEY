import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compactCurrency, currency, duration, fileSize, initials, percent, relativeTime, toDateInput } from './format.js';

test('currency formats with the requested precision', () => {
  assert.equal(currency(1234.5), '$1,234.50');
  assert.equal(currency(1234.5, 'USD', { decimals: 0 }), '$1,235');
  assert.equal(currency('41348'), '$41,348.00');
});

test('currency falls back to zero for junk input', () => {
  assert.equal(currency(undefined), '$0.00');
  assert.equal(currency('not-a-number'), '$0.00');
  assert.equal(currency(null), '$0.00');
});

test('compactCurrency shortens large numbers', () => {
  assert.equal(compactCurrency(41348), '$41.3K');
});

test('percent handles ratios and plain values', () => {
  assert.equal(percent(0.1234), '12.3%');
  assert.equal(percent(12.34, { fromRatio: false }), '12.3%');
});

test('initials takes the first and last name', () => {
  assert.equal(initials('Demo Planner'), 'DP');
  assert.equal(initials('Sathish'), 'SA');
  assert.equal(initials(''), '?');
});

test('duration renders a human month count', () => {
  assert.equal(duration(45), '3 yr 9 mo');
  assert.equal(duration(12), '1 yr');
  assert.equal(duration(7), '7 mo');
  assert.equal(duration(0), '—');
});

test('toDateInput produces a local YYYY-MM-DD string', () => {
  assert.equal(toDateInput(new Date('2030-07-01T12:00:00Z')), '2030-07-01');
});

test('relativeTime describes the past', () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
  assert.equal(relativeTime(threeDaysAgo), '3 days ago');
});

test('fileSize uses binary units', () => {
  assert.equal(fileSize(0), '0 B');
  assert.equal(fileSize(512), '512 B');
  assert.equal(fileSize(2048), '2.0 KB');
});
