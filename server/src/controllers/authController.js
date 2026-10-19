'use strict';

const bcrypt = require('bcryptjs');

const { prisma } = require('../lib/prisma');
const { HttpError } = require('../lib/http-error');
const { sendTemplate } = require('../lib/mailer');
const { signAccessToken, generateOtp, hashValue, safeEqual } = require('../utils/tokens');
const { serializeUser } = require('../serializers');

const BCRYPT_ROUNDS = 10;
const OTP_TTL_MINUTES = 15;
const RESET_TTL_MINUTES = 30;

/** Hash used for the constant-time comparison when an email is unknown. */
const DUMMY_HASH = bcrypt.hashSync('valmoney-dummy-password', BCRYPT_ROUNDS);

const issueSession = (user) => ({
  token: signAccessToken(user.id),
  user: serializeUser(user),
});

// ---------------------------------------------------------------------------
// POST /api/user/register
// ---------------------------------------------------------------------------
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw HttpError.conflict('An account with that email already exists.');

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      },
    });

    // Best effort: never let email delivery decide whether signup succeeds.
    void sendTemplate('welcome', user.email, { username: user.username });
    void sendVerificationCode(user).catch((error) => console.error('[auth] verification email failed', error.message));

    res.status(201).json(issueSession(user));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/login
// ---------------------------------------------------------------------------
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always run a comparison so response time does not reveal whether the
    // account exists.
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !valid) {
      throw HttpError.unauthorized('Incorrect email or password.');
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    res.json(issueSession(updated));
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/user/me
// ---------------------------------------------------------------------------
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw HttpError.notFound('Account not found.');
    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/user/me
// ---------------------------------------------------------------------------
async function updateProfile(req, res, next) {
  try {
    const { username, mobile, currency, extraMonthlyPayment } = req.body;
    const data = {};

    if (username !== undefined) data.username = username;
    if (mobile !== undefined) data.mobile = mobile;
    if (currency !== undefined) data.currency = currency;
    if (extraMonthlyPayment !== undefined) data.extraMonthlyPaymentCents = Math.round(extraMonthlyPayment * 100);

    const user = await prisma.user.update({ where: { id: req.userId }, data });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/change-password
// ---------------------------------------------------------------------------
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw HttpError.notFound('Account not found.');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw HttpError.badRequest('Your current password is incorrect.');

    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      throw HttpError.badRequest('Choose a password you have not used before.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    });

    res.json({ message: 'Password updated.' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/verify-email  (request a code)  |  PUT (confirm a code)
// ---------------------------------------------------------------------------
async function sendVerificationCode(user) {
  const code = generateOtp(6);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpHash: hashValue(code),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  return sendTemplate('verification', user.email, { code });
}

async function requestEmailVerification(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw HttpError.notFound('Account not found.');
    if (user.emailVerified) return res.json({ message: 'This email is already verified.', alreadyVerified: true });

    const delivery = await sendVerificationCode(user);
    res.json({ message: `Verification code sent to ${user.email}.`, delivered: delivery.delivered });
  } catch (error) {
    next(error);
  }
}

async function confirmEmailVerification(req, res, next) {
  try {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw HttpError.notFound('Account not found.');

    if (!user.otpHash || !user.otpExpiresAt) {
      throw HttpError.badRequest('Request a new verification code first.');
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw HttpError.badRequest('That code has expired. Request a new one.');
    }
    if (!safeEqual(hashValue(code), user.otpHash)) {
      throw HttpError.badRequest('That code is not correct.');
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, otpHash: null, otpExpiresAt: null },
    });

    res.json({ message: 'Email verified.', user: serializeUser(updated) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/forgot-password
// ---------------------------------------------------------------------------
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // Respond identically whether or not the address exists.
    if (user) {
      const code = generateOtp(6);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: hashValue(code),
          resetTokenExpiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
        },
      });
      void sendTemplate('passwordReset', user.email, { code });
    }

    res.json({ message: 'If that email is registered, a reset code is on its way.' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/user/reset-password
// ---------------------------------------------------------------------------
async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      !user.resetTokenHash ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() < Date.now() ||
      !safeEqual(hashValue(code), user.resetTokenHash)
    ) {
      throw HttpError.badRequest('That reset code is invalid or has expired.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        emailVerified: true, // a working code proves control of the inbox
      },
    });

    res.json({ message: 'Password reset. You can sign in now.' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/user/me
// ---------------------------------------------------------------------------
async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw HttpError.notFound('Account not found.');

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw HttpError.badRequest('That password is not correct.');
    }

    // Debts, transactions and receipts are removed by the schema's cascade rules.
    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: 'Account deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  requestEmailVerification,
  confirmEmailVerification,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
