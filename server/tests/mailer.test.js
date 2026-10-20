'use strict';

/**
 * Mailer contract tests.
 *
 * The transport is exercised with a stubbed `fetch`, so these run without
 * network access while still covering the request each provider receives and
 * the best-effort behaviour when a provider rejects a message.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://valmoney:valmoney@localhost:5433/valmoney';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-definitely-long-enough-1234567890';
process.env.MAIL_PROVIDER = 'brevo';
process.env.MAIL_API_KEY = 'test-api-key';
process.env.MAIL_FROM = 'VALMONEY <no-reply@example.com>';
delete process.env.MAIL_HOST;

const { env } = require('../src/config/env');
const { sendTemplate, buildApiRequest, templates } = require('../src/lib/mailer');

const message = {
  from: 'VALMONEY <no-reply@example.com>',
  to: 'planner@example.com',
  subject: 'Hello',
  text: 'Plain text',
  html: '<p>HTML</p>',
};

test('an HTTPS provider is selected from MAIL_PROVIDER', () => {
  assert.equal(env.mailProvider, 'brevo');
  assert.equal(env.mailEnabled, true);
});

test('Brevo requests use its endpoint, api-key header and split sender', () => {
  const request = buildApiRequest('brevo', message);
  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(request.headers['api-key'], 'test-api-key');
  assert.deepEqual(request.body, {
    sender: { email: 'no-reply@example.com', name: 'VALMONEY' },
    to: [{ email: 'planner@example.com' }],
    subject: 'Hello',
    htmlContent: '<p>HTML</p>',
    textContent: 'Plain text',
  });
});

test('Resend requests wrap the recipient in an array', () => {
  const request = buildApiRequest('resend', message, 're_test');
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.headers.Authorization, 'Bearer re_test');
  assert.deepEqual(request.body.to, ['planner@example.com']);
  assert.equal(request.body.subject, 'Hello');
});

test('SendGrid requests use personalizations and both content parts', () => {
  const request = buildApiRequest('sendgrid', message, 'SG.test');
  assert.equal(request.url, 'https://api.sendgrid.com/v3/mail/send');
  assert.deepEqual(request.body.personalizations, [{ to: [{ email: 'planner@example.com' }] }]);
  assert.deepEqual(request.body.from, { email: 'no-reply@example.com', name: 'VALMONEY' });
  assert.deepEqual(request.body.content, [
    { type: 'text/plain', value: 'Plain text' },
    { type: 'text/html', value: '<p>HTML</p>' },
  ]);
});

test('a bare sender address is accepted without a display name', () => {
  const request = buildApiRequest('brevo', { ...message, from: 'no-reply@example.com' });
  assert.deepEqual(request.body.sender, { email: 'no-reply@example.com' });
});

test('an unknown provider is rejected loudly', () => {
  assert.throws(() => buildApiRequest('carrier-pigeon', message), /Unknown mail provider/);
});

test('sending posts to the provider and returns its message id', async () => {
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({ messageId: '<abc@brevo>' }),
    };
  };

  try {
    const result = await sendTemplate('passwordReset', 'planner@example.com', { code: '246810' });
    assert.equal(result.delivered, true);
    assert.equal(result.messageId, '<abc@brevo>');

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.to[0].email, 'planner@example.com');
    assert.match(body.subject, /Reset your VALMONEY password/);
    assert.match(body.htmlContent, /246810/);
    assert.match(body.textContent, /246810/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('a provider rejection is reported, never thrown at the caller', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    headers: { get: () => null },
    text: async () => '{"message":"sender not verified"}',
  });

  try {
    const result = await sendTemplate('verification', 'planner@example.com', { code: '111111' });
    assert.equal(result.delivered, false);
    assert.match(result.reason, /400/);
    assert.match(result.reason, /sender not verified/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('unknown templates are a programming error', async () => {
  await assert.rejects(() => sendTemplate('not-a-template', 'planner@example.com'), /Unknown email template/);
});

test('templates always ship a plain-text fallback with the code', () => {
  for (const name of ['verification', 'passwordReset']) {
    const built = templates[name]({ code: '135790' });
    assert.ok(built.subject.length > 0);
    assert.match(built.text, /135790/);
    assert.match(built.html, /135790/);
  }
});
