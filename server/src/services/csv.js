'use strict';

/**
 * Minimal RFC 4180-compliant CSV writer.
 *
 * Escaping rules: wrap a field in double quotes when it contains a comma, a
 * quote, a newline — or leading/trailing whitespace — and double any embedded
 * quotes. Without this, a transaction called `Salary, June` silently corrupts
 * the export.
 */
function escapeField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers, rows, { eol = '\r\n' } = {}) {
  const lines = [headers.map(escapeField).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeField).join(','));
  }
  // Prepend a BOM so Excel opens UTF-8 exports correctly.
  return `\uFEFF${lines.join(eol)}${eol}`;
}

module.exports = { toCsv, escapeField };
