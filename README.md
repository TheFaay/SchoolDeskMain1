# SchoolDesk

SchoolDesk is the school portal for Crown Heights Academy: fees, results, attendance and notices for families and staff.

## Local setup

1. Install packages with `npm ci`.
2. Create `.env.local` using the local Neon settings already provided for this workspace, or copy `.env.example` and fill in the placeholders. Keep `.env.local` private and ignored by Git.
3. Set `DEMO_PASSWORD` in `.env.local` to a unique development password with at least 12 characters. The seed uses it for every sample account; do not use it in production.
4. Apply the schema, then seed the database in this exact order:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

In PowerShell, if script execution blocks `npm`, use `npm.cmd` for these commands.

`db:seed` is safe to rerun. It upserts the fixed development dataset and credentials. It refuses to run in production and requires `.neon` to be linked to the `dev` branch.

To clear and rebuild only the SchoolDesk sample records on the linked dev branch, run:

```bash
npm run db:reset-dev
```

This command refuses production and only removes records with the seed's fixed IDs; it does not truncate unrelated database tables. Run `npm run db:migrate` before either seed command on a new database.

## Development logins

All accounts use the `DEMO_PASSWORD` value from `.env.local`. These accounts and credentials are for development only.

| Role | Email |
|---|---|
| Parent | `parent@example.com` |
| Parent | `parent2@example.com` |
| Parent | `parent3@example.com` |
| Teacher | `teacher@example.com` |
| Teacher | `teacher2@example.com` |
| Teacher | `teacher3@example.com` |
| Bursar | `bursar@example.com` |
| Admin | `admin@example.com` |
| Applicant | `applicant@example.com` |

The parent account `parent@example.com` is linked to Chidi Okafor and Ngozi Okafor, who are in different classes. Sample records cover three classes, eight subjects, all invoice states, successful and unsuccessful payment attempts, first-term scores, attendance, notices, events and applications.

New applicants create an account at `/admissions/register` using a parent or guardian email, verify the address, then sign in to submit applications and track payment/status at `/dashboard/applicant`.

## Database tools

- `npm run db:generate` creates a migration from `lib/db/schema.ts`.
- `npm run db:migrate` applies migrations using `DATABASE_URL_UNPOOLED`.
- `npm run db:studio` opens Drizzle Studio.
- The app uses the pooled `DATABASE_URL` with Drizzle's Neon serverless pool driver.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon URL used by the app. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL used for migrations. |
| `BETTER_AUTH_SECRET` | Secret used to sign authentication data. |
| `BETTER_AUTH_URL` | Local or deployed base URL for Better Auth. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Exact trusted browser origins. |
| `DEMO_PASSWORD` | Dev-only shared password for seeded accounts; minimum 12 characters. |
| `NEXT_PUBLIC_APP_URL` | Public app base URL for links and redirects. |
| `RESEND_API_KEY`, `RESEND_FROM` | Email delivery credentials and sender. |
| `NOTICE_TEST_TO` | Development inbox for notice test delivery. |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | Paystack test credentials for development and previews. |
| `ADMISSIONS_FEE_NAIRA` | Admissions application fee in naira (development default: `80000`). |

Use `.env.example` as the safe template. Never commit `.env`, `.env.local`, or real credentials.

## Paystack test payments

The invoice checkout accepts a Paystack secret key only when it uses the `sk_test_` prefix. Set that test key and `NEXT_PUBLIC_APP_URL` in `.env.local`, then run `npm run db:migrate`. Invoice checkout amounts are computed from the current invoice balance on the server. Admissions checkout uses `ADMISSIONS_FEE_NAIRA` (currently `80000`) and stores a fee snapshot with the application. The callback verifies the transaction with Paystack, and the webhook at `/api/paystack/webhook` verifies the `x-paystack-signature` before applying it. Configure that webhook URL on a reachable preview deployment or local tunnel; the return URL is built from `NEXT_PUBLIC_APP_URL`.

Use Paystack's [test payment cards](https://paystack.com/docs/payments/test-payments/) to exercise successful, declined, and insufficient-funds results. Do not use live credentials for this stage. The application rejects non-test secret keys.
