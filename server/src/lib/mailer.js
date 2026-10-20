'use strict';

/**
 * Transactional email — HTTPS APIs first, SMTP as a fallback — plus the
 * templates every message shares.
 *
 * Delivery is deliberately best-effort: if email is not configured (or the
 * provider is briefly down) the API logs the message instead of failing the
 * request. Losing a "welcome" email must never block a signup.
 *
 * Why APIs are the default in production: hosts such as Render's free plan
 * block outbound SMTP (ports 25/465/587) but allow HTTPS. A single POST to
 * Resend, SendGrid or Brevo delivers the same message with no ports to unblock.
 */

const nodemailer = require('nodemailer');
const { env } = require('../config/env');

const SEND_TIMEOUT_MS = 15_000;

/**
 * Split a `Name <address@example.com>` sender into parts.
 * Resend accepts the raw form; Brevo and SendGrid want name and address apart.
 */
function parseFrom(from = '') {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (match) return { email: match[2].trim(), name: match[1] || undefined };
  return { email: from.trim() };
}

/** Provider request shapes — one entry per supported HTTPS API. */
const apiProviders = {
  resend: {
    url: 'https://api.resend.com/emails',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: ({ from, to, subject, text, html }) => ({ from, to: [to], subject, text, html }),
  },
  sendgrid: {
    url: 'https://api.sendgrid.com/v3/mail/send',
    headers: (key) => ({ Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }),
    body: ({ from, to, subject, text, html }) => ({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFrom(from),
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  },
  brevo: {
    url: 'https://api.brevo.com/v3/smtp/email',
    headers: (key) => ({ 'api-key': key, 'Content-Type': 'application/json' }),
    body: ({ from, to, subject, text, html }) => ({
      sender: parseFrom(from),
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  },
};

/**
 * Build the exact HTTP request for one provider. Kept separate from sending so
 * the request shapes are unit-testable without touching the network.
 */
function buildApiRequest(provider, message, apiKey = env.MAIL_API_KEY) {
  const spec = apiProviders[provider];
  if (!spec) throw new Error(`Unknown mail provider "${provider}"`);
  return { url: spec.url, headers: spec.headers(apiKey), body: spec.body(message) };
}

let transporter = null;

if (env.mailProvider === 'smtp') {
  transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE || env.MAIL_PORT === 465,
    auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
    // Fail fast rather than hanging a request for two minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

/** Wrap content in the VALMONEY shell so every email looks the same. */
function layout({ heading, body, cta }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 32px;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#ffffff;">
          <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;">VALMONEY</div>
          <div style="font-size:12px;opacity:.85;margin-top:2px;">Debt payoff planner</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;">${heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155;">${body}</div>
          ${
            cta
              ? `<div style="margin-top:28px;"><a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${cta.label}</a></div>`
              : ''
          }
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
          You are receiving this because you have a VALMONEY account. If that is not you, you can safely ignore this message.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function codeBlock(code) {
  return `<div style="margin:20px 0;padding:16px;background:#f1f5f9;border-radius:12px;text-align:center;font-size:30px;font-weight:700;letter-spacing:8px;color:#0f172a;">${code}</div>`;
}

const templates = {
  verification: ({ code }) => ({
    subject: `${code} is your VALMONEY verification code`,
    text: `Your VALMONEY verification code is ${code}. It expires in 15 minutes.`,
    html: layout({
      heading: 'Verify your email address',
      body: `<p>Enter this code to finish setting up your account:</p>${codeBlock(code)}<p style="color:#64748b;font-size:13px;">The code expires in 15 minutes.</p>`,
    }),
  }),

  passwordReset: ({ code }) => ({
    subject: 'Reset your VALMONEY password',
    text: `Use this code to reset your VALMONEY password: ${code}. It expires in 30 minutes.`,
    html: layout({
      heading: 'Reset your password',
      body: `<p>Someone asked to reset the password on your VALMONEY account. If that was you, enter this code:</p>${codeBlock(code)}<p style="color:#64748b;font-size:13px;">The code expires in 30 minutes. If this was not you, no action is needed.</p>`,
    }),
  }),

  welcome: ({ username }) => ({
    subject: 'Welcome to VALMONEY',
    text: `Welcome aboard, ${username}. Add your accounts and VALMONEY will map the fastest way out of debt.`,
    html: layout({
      heading: `Welcome aboard, ${username}`,
      body:
        '<p>You now have a payoff plan. Add each account once — balance, APR and minimum payment — and VALMONEY will show you the fastest way out, and exactly how much interest each strategy saves you.</p>' +
        '<p style="margin-bottom:0;">Two strategies, one goal: options. <strong>Avalanche</strong> attacks your highest interest rate first. <strong>Snowball</strong> clears your smallest balance first, for the early win.</p>',
      cta: { url: `${env.clientOrigins[0] ?? ''}/dashboard`, label: 'Open my dashboard' },
    }),
  }),

  milestone: ({ username, debtName, label }) => ({
    subject: `You are officially debt-free on ${debtName}`,
    text: `Nice work ${username} — ${debtName} is cleared as of ${label}. Roll that payment onto your next account.`,
    html: layout({
      heading: `🎉 ${debtName} is paid off`,
      body: `<p>Nice work, ${username}. <strong>${debtName}</strong> is cleared as of ${label}.</p><p style="margin-bottom:0;">Keep the momentum: the payment you were making is now free to attack your next account.</p>`,
      cta: { url: `${env.clientOrigins[0] ?? ''}/debts`, label: 'See my next target' },
    }),
  }),
};

/** POST one message to an HTTPS provider API. Never throws. */
async function sendViaApi(message) {
  const provider = env.mailProvider;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const request = buildApiRequest(provider, message);
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) {
      // Provider errors name the exact problem (unverified sender, bad key…),
      // so keep enough of the body to be useful in the logs.
      return { delivered: false, reason: `${provider} responded ${response.status}: ${raw.slice(0, 200)}` };
    }

    let messageId = response.headers.get('x-message-id') ?? undefined;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      messageId = parsed?.id ?? parsed?.messageId ?? messageId;
    } catch {
      // Some providers answer 202 with an empty body; the header is enough.
    }
    return { delivered: true, messageId };
  } catch (error) {
    const reason = error.name === 'AbortError' ? `${provider} timed out after ${SEND_TIMEOUT_MS / 1000}s` : error.message;
    return { delivered: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a templated email.
 * @returns {Promise<{delivered:boolean, reason?:string, messageId?:string}>}
 */
async function sendTemplate(name, to, data = {}) {
  const template = templates[name];
  if (!template) throw new Error(`Unknown email template "${name}"`);

  const { subject, text, html } = template(data);

  if (env.mailProvider === 'log') {
    console.log(`[mail:dev] to=${to} subject="${subject}"${data.code ? ` code=${data.code}` : ''}`);
    return { delivered: false, reason: 'mail-not-configured' };
  }

  const message = { from: env.MAIL_FROM, to, subject, text, html };

  let result;
  if (env.mailProvider === 'smtp') {
    try {
      const info = await transporter.sendMail(message);
      result = { delivered: true, messageId: info.messageId };
    } catch (error) {
      result = { delivered: false, reason: error.message };
    }
  } else {
    result = await sendViaApi(message);
  }

  if (!result.delivered) {
    console.error(`[mail] failed to deliver "${subject}" to ${to}: ${result.reason}`);
  }
  return result;
}

/** Cheap authenticated GET per provider, used once at boot as a smoke test. */
const verifyProbes = {
  resend: { url: 'https://api.resend.com/domains', headers: (key) => ({ Authorization: `Bearer ${key}` }) },
  brevo: { url: 'https://api.brevo.com/v3/account', headers: (key) => ({ 'api-key': key }) },
};

/**
 * Verify the mail configuration at boot (never fatal, never blocking).
 * SendGrid keys are often scoped to mail-send only, so its key is not probed.
 */
async function verifyTransport() {
  if (env.mailProvider === 'log') return false;

  if (env.mailProvider === 'smtp') {
    try {
      await transporter.verify();
      console.log('✅ SMTP transport verified');
      return true;
    } catch (error) {
      console.warn(`⚠  SMTP transport not usable: ${error.message}`);
      return false;
    }
  }

  const probe = verifyProbes[env.mailProvider];
  const sender = env.MAIL_FROM;

  if (!probe) {
    console.log(`✅ ${env.mailProvider} configured — sending as ${sender}`);
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(probe.url, { headers: probe.headers(env.MAIL_API_KEY), signal: controller.signal });
    if (response.ok) {
      console.log(`✅ ${env.mailProvider} API key accepted — sending as ${sender}`);
      return true;
    }
    const raw = await response.text();
    console.warn(`⚠  ${env.mailProvider} rejected the API key (${response.status}): ${raw.slice(0, 200)}`);
    return false;
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timed out' : error.message;
    console.warn(`⚠  could not reach ${env.mailProvider}: ${reason}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendTemplate, verifyTransport, templates, buildApiRequest, apiProviders };
