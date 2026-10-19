'use strict';

/**
 * SMTP transport + transactional email templates.
 *
 * Delivery is deliberately best-effort: if SMTP is not configured (or the
 * provider is briefly down) the API logs the message instead of failing the
 * request. Losing a "welcome" email must never block a signup.
 */

const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let transporter = null;

if (env.mailEnabled) {
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

/**
 * Send a templated email.
 * @returns {Promise<{delivered:boolean, reason?:string, messageId?:string}>}
 */
async function sendTemplate(name, to, data = {}) {
  const template = templates[name];
  if (!template) throw new Error(`Unknown email template "${name}"`);

  const { subject, text, html } = template(data);

  if (!transporter) {
    console.log(`[mail:dev] to=${to} subject="${subject}"${data.code ? ` code=${data.code}` : ''}`);
    return { delivered: false, reason: 'smtp-not-configured' };
  }

  try {
    const info = await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    return { delivered: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[mail] failed to deliver "${subject}" to ${to}: ${error.message}`);
    return { delivered: false, reason: error.message };
  }
}

/** Verify SMTP credentials at boot (never fatal). */
async function verifyTransport() {
  if (!transporter) return false;
  try {
    await transporter.verify();
    console.log('✅ SMTP transport verified');
    return true;
  } catch (error) {
    console.warn(`⚠  SMTP transport not usable: ${error.message}`);
    return false;
  }
}

module.exports = { sendTemplate, verifyTransport, templates };
