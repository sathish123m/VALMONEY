# VALMONEY — Debt Payoff Planner

![Stack](https://img.shields.io/badge/stack-React%20%C2%B7%20Node%20%C2%B7%20Express%20%C2%B7%20PostgreSQL%20%C2%B7%20Prisma-blue)
![Tests](https://img.shields.io/badge/tests-49%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

VALMONEY turns a pile of debts into a dated plan. Add your accounts once, and the app
runs a month-by-month amortisation of every balance to answer the only questions that
matter: **when will I be debt-free, how much interest will I pay, and which strategy
gets me there cheapest?**

Two strategies are simulated side by side — **avalanche** (highest APR first) and
**snowball** (smallest balance first) — each compared against a minimum-payments-only
baseline so the "interest saved" figure is real money, not a rounded estimate.

Web: https://valmoney.vercel.app · API: `https://<your-service>.onrender.com` (see [Deployment](#deployment))

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [npm scripts](#npm-scripts)
- [REST API reference](#rest-api-reference)
- [How the payoff engine works](#how-the-payoff-engine-works)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Known advisories](#known-advisories)
- [License](#license)

---

## Features

| Area | What it does |
| --- | --- |
| **Payoff engine** | Month-by-month amortisation of every account with accruing interest, minimum payments and an extra monthly payment. Returns a payoff order, per-account interest, the debt-free date and the interest saved versus paying minimums only. |
| **Strategy comparison** | Avalanche vs snowball vs minimums-only, with the delta between them ("avalanche saves $465.03 more than snowball"), including a snowball-vs-minimum-only pair so the UI can show the true cost of a sub-optimal order. |
| **What-if slider** | An extra-payment sensitivity sweep (up to +$1,500/mo) showing the effect of each increment on the payoff month and total interest, on both the dashboard and the landing page. |
| **Dashboard** | Portfolio totals, per-strategy projections, this month's cash flow, upcoming due dates, a spending breakdown by category, recent activity and a 0–100 financial health score with actionable reasons. |
| **Accounts** | Full CRUD for credit cards, student/auto/personal loans, mortgages and medical debt, with APR, minimum payment, optional credit limit, due day and notes. |
| **Ledger** | Transaction ledger with search, category/type/date filters, sorting, pagination, running summary and CSV export. |
| **Document vault** | Drag-and-drop receipt upload (JPEG/PNG/WEBP/HEIC/PDF) that extracts the vendor, total and date from the document, then lets you edit or delete each entry. Files are streamed back only to their owner. |
| **Accounts & auth** | Register, login (JWT bearer), forgot/reset password with a 6-digit emailed code, email verification, profile updates, change password and account deletion. |
| **Marketing site** | Public landing page whose headline numbers and strategy demo are computed by a browser-side mirror of the same payoff engine — no API round trip, no hard-coded figures. |
| **UI system** | Custom Tailwind design system (dark by default, light theme persisted), toasts, focus-trapped modals, skeleton loaders, responsive down to 360 px, reduced-motion aware. |

## Tech stack

**Frontend**

| Package | Version | Role |
| --- | --- | --- |
| React | 18.3 | UI runtime (lazy routes, Suspense) |
| Vite | 5.4 | Dev server & production build |
| React Router | 6.30 | Client-side routing, guarded routes |
| Tailwind CSS | 3.4 | Design tokens, dark/light theming |
| Recharts | 2.15 | Payoff, cash-flow and breakdown charts |
| lucide-react | 1.x | Icon set |
| clsx + tailwind-merge | 2.x | Class composition for the UI primitives |

**Backend**

| Package | Version | Role |
| --- | --- | --- |
| Node.js | ≥ 20.19 | Runtime (CommonJS, no build step) |
| Express | 4.22 | HTTP layer, routing, middleware |
| Prisma | 7.10 | Schema, migrations, typed queries (`@prisma/adapter-pg` driver adapter) |
| PostgreSQL | 16 | Datastore |
| Zod | 3.25 | Request validation and coercion |
| jsonwebtoken / bcryptjs | 9.x / 3.x | JWT sessions, password hashing (10 rounds) |
| Nodemailer | 10.x | SMTP transactional email |
| Multer | 2.x | Receipt uploads (MIME allow-list, size cap) |
| Helmet / express-rate-limit | 8.x / 8.x | Security headers, per-route throttling |
| Morgan | 1.12 | Request logging |

**Tooling** — ESLint 9 (flat config in both packages), Node's built-in test runner
(`node --test`) with `supertest`, GitHub Actions CI, Docker Compose for local Postgres
(+ Adminer).

## Architecture

```
VALMONEY/
├── client/                     # React SPA (Vite)
│   ├── src/
│   │   ├── components/         # ui/ · layout/ · dashboard/ · accounts/ · charts/ · marketing/
│   │   ├── context/            # Auth, Theme, Toast providers
│   │   ├── hooks/              # data fetching, reveal-on-scroll, media query
│   │   ├── lib/                # api.js (REST client) · payoff.js (engine mirror) · format.js
│   │   └── pages/              # Landing, Dashboard, Accounts, Ledger, Documents, Settings, auth/
│   └── vercel.json             # SPA rewrites, cache & security headers
├── server/                     # REST API (Express + Prisma)
│   ├── prisma/                 # schema.prisma · migrations/ · seed.js
│   ├── src/
│   │   ├── config/env.js       # Zod-validated environment
│   │   ├── controllers/        # auth · debt · transaction · receipt · dashboard
│   │   ├── middleware/         # auth · validate · error · rate-limit
│   │   ├── routes/             # /api/user · /api/debts · /api/transactions · /api/receipts
│   │   ├── serializers/        # cents ⇄ dollars, bps ⇄ percent
│   │   ├── services/           # payoff.js (engine) · receiptParser.js · health.js · csv.js
│   │   └── utils/tokens.js     # JWT signing/verification
│   ├── tests/                  # 31 API & engine tests
│   ├── docker-compose.yml      # Postgres 16 on :5433 + Adminer on :8080
│   └── render.yaml             # Render blueprint (web service + database)
└── .github/workflows/ci.yml    # lint + test + build for both packages
```

The API is stateless: the SPA holds the JWT in memory and `localStorage`, and sends it as
`Authorization: Bearer <token>`. Every mutating request is validated with Zod before it
reaches a controller, and Prisma queries are always scoped by the authenticated `userId`.

## Quick start

**Prerequisites:** Node.js ≥ 20.19 and Docker (or any reachable PostgreSQL 16 instance).

```bash
git clone https://github.com/sathish123m/VALMONEY.git
cd VALMONEY

# --- 1. Database + API -------------------------------------------------------
cd server
docker compose up -d db            # Postgres 16 on localhost:5433, Adminer on :8080

cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # → paste as JWT_SECRET

npm ci                             # postinstall runs `prisma generate`
npm run db:deploy                  # apply migrations
npm run db:seed                    # optional: demo user + 6 months of history
npm run dev                        # http://localhost:5001
```

```bash
# --- 2. Web app (new terminal) ----------------------------------------------
cd client
cp .env.example .env
npm ci
npm run dev                        # http://localhost:5173
```

Seeded demo account: **demo@valmoney.app / Demo1234** — four accounts, $41,348.00 of
debt, seven months of transactions, so every chart and panel has data on first load.

Email is optional in development: with `MAIL_FROM` empty the API logs messages to the
console instead of sending them, and password-reset codes appear as
`[mail:dev] … code=123456`.

## Environment variables

### `server/.env`

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | — | `development` | `development` \| `test` \| `production` |
| `PORT` | — | `5001` | |
| `DATABASE_URL` | ✅ | — | `postgresql://…` — add `?sslmode=require` for hosted Postgres |
| `JWT_SECRET` | ✅ | — | ≥ 32 characters; the API refuses to boot otherwise |
| `JWT_EXPIRES_IN` | — | `7d` | any `ms`-style duration |
| `CLIENT_ORIGIN` | — | `http://localhost:5173` | comma-separated CORS allow-list |
| `MAIL_PROVIDER` | — | — | `resend` \| `sendgrid` \| `brevo` \| `smtp` — how email is sent |
| `MAIL_API_KEY` | — | — | API key for the chosen HTTPS provider |
| `MAIL_HOST` | — | — | SMTP alternative: e.g. `smtp.gmail.com` |
| `MAIL_PORT` | — | `587` | `465` switches to implicit TLS automatically |
| `MAIL_SECURE` | — | `false` | |
| `MAIL_USER` / `MAIL_PASS` | — | — | SMTP credentials (Gmail needs an app password) |
| `MAIL_FROM` | — | — | sender address; when empty, email is logged, not sent |
| `UPLOAD_DIR` | — | `./uploads` | receipt storage; use a persistent disk in production |
| `MAX_UPLOAD_MB` | — | `10` | per-file upload cap |
| `AUTO_SEED` | — | `false` | on boot, create the demo account if the database has no users yet |

### `client/.env`

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VITE_API_URL` | — | `http://localhost:5001` | base URL of the API, no trailing slash |

## npm scripts

| Package | Script | What it runs |
| --- | --- | --- |
| `server` | `npm run dev` | `node --watch src/server.js` |
| | `npm start` | production entry point |
| | `npm test` | 31 API + engine tests (`node --test`) |
| | `npm run lint` | ESLint 9 flat config over `src` and `tests` |
| | `npm run db:migrate` | `prisma migrate dev` (creates a migration) |
| | `npm run db:deploy` | `prisma migrate deploy` (applies existing migrations) |
| | `npm run db:seed` | reseeds the demo account |
| | `npm run db:studio` | Prisma Studio |
| `client` | `npm run dev` | Vite dev server |
| | `npm run build` | production bundle into `dist/` |
| | `npm run preview` | serve the built bundle |
| | `npm test` | 18 engine + formatting tests |
| | `npm run lint` | ESLint over `src` |

## REST API reference

Base URL `http://localhost:5001`. All responses are JSON. Authenticated routes expect
`Authorization: Bearer <token>`.

Money is **accepted** as dollars (`"balance": 1200.5`) and **returned** both ways:
`balance: 1200.5` plus `balanceCents: 120050`. Rates are accepted as percentages
(`"apr": 19.99`) and returned with `aprBps: 1999`.

### Auth & profile — `/api/user`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | — | create an account, returns `{ user, token }` |
| POST | `/login` | — | email + password → `{ user, token }` |
| POST | `/forgot-password` | — | emails a 6-digit reset code (30-min TTL) |
| POST | `/reset-password` | — | `{ email, code, newPassword }` |
| GET | `/me` | ✅ | current profile, currency, extra monthly payment |
| PATCH | `/me` | ✅ | username, mobile, currency, `extraMonthlyPayment` |
| DELETE | `/me` | ✅ | delete the account and all of its data (password required) |
| POST | `/change-password` | ✅ | current + new password |
| POST | `/verify-email` | ✅ | sends a 6-digit verification code (15-min TTL) |
| PUT | `/verify-email` | ✅ | confirms the code |

### Debts — `/api/debts`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | ✅ | list accounts with portfolio totals |
| POST | `/` | ✅ | create an account (alias: `POST /api/debts/add`) |
| GET | `/strategy` | ✅ | payoff projections. Query: `strategy=avalanche\|snowball\|both`, `extra=<dollars>`, `scenarios=true` |
| GET | `/:id` | ✅ | single account |
| PATCH | `/:id` | ✅ | partial update |
| DELETE | `/:id` | ✅ | delete |

### Transactions — `/api/transactions`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | ✅ | paginated list; `search`, `category`, `type`, `from`, `to`, `limit`, `offset`, `sort=newest\|oldest\|largest` |
| POST | `/` | ✅ | create a ledger entry (signed `amount`, optional `debtId`) |
| GET | `/summary` | ✅ | income / expense / payment totals and category breakdown |
| GET | `/export` | ✅ | CSV download (`Content-Disposition`) |
| PATCH | `/:id` | ✅ | partial update |
| DELETE | `/:id` | ✅ | delete |

### Receipts — `/api/receipts`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/` | ✅ | paginated receipt list |
| POST | `/` | ✅ | `multipart/form-data` upload (field `file`); parses vendor/total/date |
| GET | `/:id/file` | ✅ | stream the stored file back to its owner |
| PATCH | `/:id` | ✅ | correct the extracted fields or add notes |
| DELETE | `/:id` | ✅ | delete the record and the stored file |

### Overview & health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | ✅ | one call for totals, both projections, month cash flow, due dates, spending mix, health score |
| GET | `/api/health` | — | uptime probe (`status`, `uptimeSeconds`, mail mode) |
| GET | `/` | — | service banner |

Errors are structured and stable: `{ "error": "message", "details": [{ "field", "message" }] }`
with `400` / `401` / `403` / `404` / `409` / `413` / `422` / `429` / `500` status codes.
Credential endpoints allow 20 attempts / 15 min, email endpoints 5 sends / hour, and the
rest of the API 600 requests / 15 min per IP.

## How the payoff engine works

`server/src/services/payoff.js` (mirrored, deliberately, in `client/src/lib/payoff.js`
so the public landing page can compute its demo instantly):

1. Normalises the portfolio — balances, rates and minimums are integers
   (cents / basis points) to keep the arithmetic free of floating-point drift.
2. Each month: adds `balance × APR ÷ 12` interest to every open account, applies each
   minimum payment, then throws the whole remaining snowball (your minimum outlay plus
   the extra payment) at one priority account — highest APR for avalanche, lowest
   balance for snowball.
3. Repeats until every balance reaches zero, recording the month, the interest paid per
   account and the running total.
4. The same portfolio is simulated once more with minimums only; the difference in total
   interest is the **interest saved**.
5. Returns `monthsToDebtFree`, `debtFreeDate` (first of the payoff month, UTC),
   `totalInterestCents`, `totalPaidCents`, the `payoffOrder[]` with per-account interest,
   the avalanche-vs-snowball delta and an optional extra-payment scenario sweep.

The engine is pure (no I/O, no clock beyond the injected start month), which is what makes
it cheap to test and safe to run on every request.

## Testing

```bash
cd server && npm test     # 31 tests — API contracts, auth guards, engine maths, CSV, parsing
cd client && npm test     # 18 tests — engine parity with the server, formatting helpers
cd client && npm run lint # ESLint 9, zero warnings
```

The server suite mounts the real Express app with `supertest` and never touches the
database, so it runs anywhere — including CI without a Postgres service. The engine
numbers asserted on both sides are identical (e.g. the demo portfolio: avalanche pays off
in 45 months with $5,555.59 of interest, snowball in 46 months with $6,020.62, and
avalanche saves $46,503 in interest against minimums-only). CI runs lint, tests and a
production build for both packages on Node 20, 22 and 24.

## Deployment

**Web app → Vercel.** Root directory `client`, framework preset *Vite*, build
`npm run build`, output `dist`. `client/vercel.json` adds the SPA rewrite to
`index.html`, immutable caching for hashed assets, and security headers. Set one
environment variable in the project:

```
VITE_API_URL = https://<your-api-host>
```

**API → Render.** `server/render.yaml` is a blueprint for the Node web service on the
**Free** plan (the service is named `valmoney-backend` to match the `VITE_API_URL` the
Vercel project already uses — rename it and update the variable if the name is taken).
Render defaults to a `render.yaml` at the repository root, so set **Blueprint Path** to
`server/render.yaml` when creating it. The blueprint asks for `DATABASE_URL`; a free
[Neon](https://neon.com) project is the recommended source because it does not expire.
The deploy runs `prisma migrate deploy` and, because free instances have no shell to run
`db:seed`, the server seeds the demo account itself on first boot (`AUTO_SEED=true`, and
only while the database has no accounts).

Manual setup is equivalent: root directory `server`, build
`npm ci`, start `npm run db:deploy && npm start`, health check `/api/health`. The
`prisma` CLI is a runtime dependency on purpose: hosts that build with
`NODE_ENV=production` skip devDependencies, and both the `postinstall` generate step and
the migration command need it. Required
environment variables: `NODE_ENV=production`, `DATABASE_URL` (Neon/Supabase/Render,
`?sslmode=require`), `JWT_SECRET`, `CLIENT_ORIGIN` (your Vercel URL, plus any preview
domains you use), and optionally the `MAIL_*` group for real email.

Receipts are written to `UPLOAD_DIR`; on Render attach a persistent disk and point
`UPLOAD_DIR` at it, otherwise uploads disappear on redeploy.

Any Postgres works: create the database, run `npm run db:deploy`, and the schema is in
`server/prisma/migrations/`.

### Email on a host that blocks SMTP

Free Render instances cannot open ports 25/465/587, so the API sends over HTTPS instead.
Pick one provider, add its key in Render's **Environment** tab, and email works with no
domain of your own:

| `MAIL_PROVIDER` | Free allowance | Sender you can use |
| --- | --- | --- |
| `brevo` | 300/day | any address you verify once by email code |
| `resend` | 3,000/month | `onboarding@resend.dev` — but it only delivers to the address on your Resend account until you verify a domain |
| `sendgrid` | 100/day | any address you verify with Single Sender Verification |

```bash
MAIL_PROVIDER=brevo
MAIL_API_KEY=xkeysib-…
MAIL_FROM=VALMONEY <no-reply@your-verified-address.com>
```

The API probes the key once at boot and logs `✅ brevo API key accepted — sending as …`;
a wrong key is reported in the logs without stopping the service. With none of this set,
codes are printed to the logs as `[mail:dev] … code=123456` and every flow still works.

### Free-hosting caveats

The API service runs on Render's **Free** plan, which needs no payment method but comes
with limits worth knowing before you demo the app ([Render's list](https://render.com/docs/free)):

| Limit | What it means here |
| --- | --- |
| Spins down after 15 minutes idle, ~1 minute to wake | The web client warms the API as the sign-in page loads and, if a request still lands during a cold start, says the API is starting up rather than hanging. |
| Outbound SMTP (ports 25/465/587) is blocked | Send through an HTTPS API instead (`MAIL_PROVIDER` = `resend`, `sendgrid` or `brevo`), which is supported out of the box. Left unset, codes are written to the service logs as `[mail:dev] … code=123456`. |
| No shell access | `AUTO_SEED=true` seeds the demo account on first boot instead of `npm run db:seed` needing a shell (or a paid instance). |
| Render's free Postgres expires 30 days after creation | Use a free [Neon](https://neon.com) project instead — it has no expiry. Paste its connection string into `DATABASE_URL`. |
| Ephemeral filesystem | Uploaded receipts are lost when the service restarts. Attach the disk in `server/render.yaml` on a paid instance to keep them. |
| 750 free instance hours per month | A service that never sleeps would use roughly all of them, so avoid uptime keep-alive pings. |

## Security notes

- Passwords are bcrypt-hashed (10 rounds) and never returned by any endpoint.
- JWT bearer tokens (`7d`), signed with a mandatory 32+ character secret.
- Helmet security headers, an explicit CORS allow-list (no `*` with credentials) and
  per-route rate limiting with `trust proxy` configured for hosted proxies.
- Every request body/query is validated and coerced by Zod before a controller runs.
- Uploads are restricted by MIME type and size, stored under a random file name, and
  streamed back only to the owning user — the stored name is never exposed.
- Ownership checks return `404`, never `403`, so the API cannot be used to probe which
  IDs exist.
- Reset codes and OTPs are stored as hashes with short expiries, and login uses a dummy
  hash comparison to avoid leaking whether an email is registered through timing.
- No secrets are committed: `.env` files are git-ignored, `.env.example` documents the
  shape.

## Known advisories

`server` reports `0 vulnerabilities` from `npm audit`. On the client, the remaining
entries are dev-toolchain or out-of-scope for this release:

| Advisory | Severity | Why it is accepted |
| --- | --- | --- |
| `react-router` 6.x (backslash/SSR path handling) | moderate | No fix inside 6.x; the affected SSR and backslash-redirect code paths are not used by this SPA. |
| Vite 5 `esbuild` dev-server request | moderate | Development-server-only; upgrading crosses a major (Vite 7) and is tracked separately. |
| Tailwind 3 `chokidar`/`glob` chain | moderate | Build-time file watcher, never shipped to the browser. |

The test runner was moved from Vitest to Node's built-in `node --test` specifically to
drop a critical dev advisory from the tree.

## License

MIT — see [LICENSE](LICENSE).
