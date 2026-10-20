'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { env } = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { apiLimiter } = require('./middleware/rate-limit');

/**
 * Build the Express application.
 *
 * Kept separate from `server.js` so tests can mount the app with supertest
 * without binding a port.
 */
function createApp() {
  const app = express();

  // Render/Vercel/Heroku all terminate TLS in front of us; without this the
  // rate limiter would see every request as coming from the proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Receipt images are served from a different origin than the SPA.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowed = env.clientOrigins;
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin, server-to-server and cURL requests have no Origin header.
        if (!origin) return callback(null, true);
        if (allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      exposedHeaders: ['auth-token', 'Content-Disposition'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  // Uptime probes (Render, Vercel, load balancers).
  app.get('/', (_req, res) => {
    res.json({ service: 'VALMONEY API', version: '2.0.0', status: 'ok' });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.NODE_ENV,
      mail: env.mailEnabled ? env.mailProvider : 'log-only',
      time: new Date().toISOString(),
    });
  });

  app.use('/api', apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
