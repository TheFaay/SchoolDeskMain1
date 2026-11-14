# SchoolDesk: Path to a Working Product

Solo checklist. Work top to bottom. Each stage has an **exit check**: do not start the next stage until it passes.
Status: Stages 0–11 implementation is present; Stage 10's empty-school setup walkthrough remains to verify. Stage 12 now includes email-verified applicant/guardian sign-up, login, application ownership, status tracking and a back-and-forth application wizard. Admissions checkout and invoice checkout remain test-key-only; the production build and seeded role routes pass. Resend domain verification, a completed Paystack test-card payment, public webhook delivery and selected end-to-end forms still need external verification. Stage 14's responsive public site, SchoolDesk overview and SEO metadata are implemented; verified contact details and throttled mobile performance review remain. Production release remains deferred below. Nothing goes to `main` until the final stage.

### Stage 0 decisions

- **D1 — Score split:** CA 40 / Exam 60. This matches the existing server-side teacher scoring constants in `lib/scores/grading.ts`; the results display will be aligned in its later stage.
- **D2 — Session and term:** sessions use `YYYY/YYYY` (for example `2026/2027`); terms are `first | second | third`.
- **D3 — Current session and term:** stored in a database settings row, introduced in Stage 2.
- **D4 — Money:** retain exact `numeric(12,2)` naira values; accept two decimal places (kobo precision).
- **D5 — Part payments:** allowed; minimum payment is ₦0.01, with no separate configurable minimum.
- **D6 — Account creation:** admin creates all accounts; public sign-up is disabled.
- **D7 — Parent-child linking:** admin links parents manually.
- **D8 — Canonical pages:** `/dashboard` (parent), `/dashboard/teacher`, `/dashboard/bursar`, `/dashboard/admin`; duplicates will be merged/deleted in Stages 8–9.
- **D9 — Admissions:** applicants/parents create an email-verified applicant account to submit and track applications; the guardian email owns the application.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **(P0)** blocker, **(P1)** needed to be "working", **(P2)** polish

---

## Stage 0: Decisions and baseline

Decide these once. Everything later depends on them.

- [x] **D1. Score split:** CA 40 / Exam 60; centralized in `lib/scores/grading.ts`.
- [x] **D2. Session and term naming:** `YYYY/YYYY` and `first | second | third`.
- [x] **D3. Current session and term:** database settings row (Stage 2).
- [x] **D4. Money:** `numeric(12,2)` naira with kobo precision.
- [x] **D5. Part payments:** allowed; ₦0.01 minimum, not configurable.
- [x] **D6. Who creates accounts:** admin only; no public sign-up.
- [x] **D7. Parent-child linking:** manual admin linking.
- [x] **D8. One canonical page per role:** parent `/dashboard`, teacher `/dashboard/teacher`, bursar `/dashboard/bursar`, admin `/dashboard/admin` (merge work in Stages 8–9).
- [x] **D9. Admissions:** verified applicant accounts, application reference, and a guardian-owned application portal.

Baseline:

- [x] Create working branch `codex/stage-1-security`. Do not touch `main`.
- [x] Run `npm ci`, `npm run build`, and `npm run lint`. Record every error in a "Build errors" list at the bottom of this file.
- [x] Verify `cacheComponents` and `partialPrefetching` in the installed Next.js docs. `instant` is a per-route segment export, not a `next.config.ts` option. Replace the Turbopack-only Tailwind loader with the official Tailwind v4 PostCSS plugin so both build engines generate utility CSS.
- [x] Create fresh Neon `dev` and `test` branches from `production`. Keep the local link on `dev`; use the pooled URL for the app and the direct URL for migrations.
- [x] Keep `.env.example` as the safe template; Neon CLI provides the local `.env.local`. Add the required email, Paystack, direct database, trusted-origin, and app URL variables to `.env.example`; Drizzle migrations use Neon's `DATABASE_URL_UNPOOLED`.
- [x] Confirm `.env` is ignored by git and no secrets are in history.

**Exit check:** project builds cleanly and connects to Neon; D1 to D9 are written down.

---

## Stage 1: Security foundation (P0)

- [x] **Block role self-assignment.** In `lib/auth.ts`, set `role` to `input: false` in `additionalFields`.
- [x] **Disable public sign-up** (`emailAndPassword.disableSignUp: true`, or route sign-up through an admin-only action).
- [x] Set local `BETTER_AUTH_URL` and exact-origin parsing in `trustedOrigins`. Add the actual preview/production origins to deployment variables in Stage 15 when those hosts exist.
- [x] Add a database `CHECK` (or enum) so `user.role` can only be `parent | teacher | bursar | admin`. Migration `0005` was applied and confirmed on Neon dev; an invalid-role insert was rejected.
- [x] Add `proxy.ts` (Next 16 convention) that redirects signed-out visitors away from every private page path. Built-app HTTP checks returned `307 /login` for all private pages and APIs.
- [x] Add `requireRole()` or an equivalent session/role guard to every private page, server action and API route. Known routes are listed below:
- [x] `/fees/**`
- [x] `/parent/dashboard`
- [x] `/bursar`
- [x] `/teacher/scores`
- [x] `/api/teacher/scores` (GET and POST session/role guards)
- [x] `/api/results/report-sheet` (session, parent/admin role, and real parent-child DB link guard)
- [x] `/dashboard/academics/results` (parent/admin role gate)
- [x] `/admin/classes`
- [x] `sendNotice` (admin only)
- [x] Server actions: re-check roles inside fee, attendance and results-publishing actions; notice sending is admin-only.
- [x] Replace sample identity fallbacks with the session user. `getCurrentParent()` now resolves the authenticated user; sample results are scoped to the seeded demo parent only.
- [x] Ownership checks: fees, receipts, report PDFs and attendance use the signed-in parent's links. The shared `assertParentOwnsStudent()` rejects unrelated and malformed student IDs; invoice, receipt and attendance ownership were exercised with temporary dev records.
- [x] Add rate limiting on sign-in (5 attempts per minute); the sixth synthetic failed attempt was rejected. Password reset requests are also capped at 3 per minute.
- [x] Remove the committed demo password from code and docs. `scripts/createDemoUsers.ts` now requires `DEMO_PASSWORD` and refuses production.
- [x] Session expiry and sign-out tested: signed-out and expired sessions are rejected, sign-out revokes the active session.
- [x] Add a self-service password reset flow. Request/reset screens, configured Resend sender, Better Auth token/session revocation, and replacement-password sign-in passed the temporary-account check. No real email was sent during verification.

**Exit check:** while signed out, every private URL redirects to `/login`. As a parent, requesting another family's invoice or student ID returns a denied page. A sign-up request with `role: "admin"` fails.

---

## Stage 2: Schema and data model

One migration pass. Generate with `drizzle-kit`; never hand-edit applied migrations.

- [x] **Settings / academic calendar table.** Current session, current term, term start and end dates, and "days school was open".
- [x] Replace free-text `invoices.session` and `invoices.term` with the session value plus the score-term enum (per D2).
- [x] Add foreign keys:
  - [x] `parent_students.parent_user_id` → `user.id`
  - [x] `teacher_assignments.teacher_user_id`, `class_id`, `subject_id`
  - [x] `scores.student_id`, `subject_id`, `class_id`
  - [x] `results_published.class_id`
  - [x] `attendance_records.marked_by` → `user.id`
  - [x] `scores.entered_by` → `user.id`
- [x] `scores`: add `session` (a score must belong to a session and term). Add `CHECK` constraints for CA and exam ranges per D1.
- [x] `results_published`: add `session`, `published_by`, `published_at`.
- [x] **`notices` table** (title, body, audience, created_by, created_at, class_id nullable) and a `notice_reads` or delivery-log table.
- [x] **Admissions tables:** `applications` (applicant details, class applied for, status, reference number) and `application_documents` (storage key, type, size).
- [x] **Payments table fixes:**
- [x] `paystack_reference` unique
- [x] `raw_event` (jsonb) for webhook audit
- [x] `CHECK (amount > 0)`
- [x] a payments-per-invoice balance guard (implemented and concurrency-tested with the atomic payment workflow in Stage 4).
- [x] Invoices: keep the stored `status` column and update it transactionally with payment writes in Stage 4.
- [x] Add `events` (calendar) table for the parent dashboard "Upcoming events".
- [x] Add a student `status` (active, graduated, withdrawn); class promotion will be handled with session setup.
- [x] Switch to a driver that supports transactions (`drizzle-orm/neon-serverless` Pool/WebSocket) for any multi-statement write.
- [x] Remove `lib/scores/proposed-schema.ts` (superseded by `schema.ts`).
- [x] Run `db:generate`, review the SQL, then `db:migrate` on the dev branch.

**Exit check:** migration applied cleanly to the previously empty Neon dev database; `db:generate` reports no schema changes and a second `db:migrate` succeeds. The balance guard is explicitly deferred to Stage 4's transaction workflow.

---

## Stage 3: Environment and seed (P0)

Goal: one command produces a complete, internally consistent school.

- [x] Merge `seed.ts`, `backfill-fees.ts` and `createDemoUsers.ts` into one ordered seed (`db:reset-dev`): users → classes → subjects → students → parent links → assignments → fees → scores → attendance → notices.
- [x] Delete `backfill-fees.ts` after the migration handles old data.
- [x] **Single source of truth for IDs and names.** One parent name, one set of children, one session. Remove all sample data files:
  - [x] `app/lib/results/sampleData.ts`
  - [x] `app/parent/dashboard/sample-data.ts`
  - [x] `app/attendance-preview/demo-data.ts`
  - [x] the `TEMP_*` maps in `lib/scores/data.ts`
- [x] Seed content, enough to exercise every screen:
  - [x] 4 users (one per role) plus at least 2 extra parents and 2 extra teachers
  - [x] 3 or more classes, with 6 to 10 students each
  - [x] 8 or more subjects, and teacher assignments for each
  - [x] one parent with 2 children in different classes, one parent with 1 child, one student with no linked parent
  - [x] invoices in every state: paid, part-paid, unpaid, overdue (past due date), cancelled
  - [x] payments including a failed and a pending one
  - [x] a full term of scores for at least one class, including edge cases (0, 100, ties for position)
  - [x] one class published, one not
  - [x] a month of attendance with a mix of statuses
  - [x] 3 or more notices
  - [x] 2 or more admissions applications
- [x] Make the seed idempotent (safe to re-run) and add a `--wipe` option for dev only. It must refuse to run if `NODE_ENV=production`.
- [x] Update the README: exact order of commands (`migrate` → `seed`), env variables, demo logins (dev only).

**Exit check:** wipe, migrate and seed completed on the linked Neon dev branch in under a minute. Seed insertions passed the database's foreign-key constraints; the seed uses one session constant and fixed IDs/names across related tables.

---

## Stage 4: Fees and payments correctness (P0)

- [x] Remove the hardcoded `status: "successful"` and `method: "test"` mapping. Read both from the row.
- [x] Only `status = success` payments count toward amount paid, on every screen (parent, fees, bursar, dashboard).
- [x] **Atomic payment write.** In one transaction: lock the invoice row (`SELECT ... FOR UPDATE`), recompute balance from the database, reject overpayment, insert payment, allocate receipt number. Do not trust a balance computed before the call.
- [x] Receipt numbers from a database counter updated in the same transaction. Delete the in-memory `receiptSequenceByYear` and lock.
- [x] Derive invoice status in one place: paid, partial, unpaid, **overdue** (due date passed and balance greater than 0), cancelled. Use the Africa/Lagos date.
- [x] Exclude cancelled invoices from every total.
- [x] Do all money math in kobo or via `numeric` in SQL, not JS floats (per D4). Add unit tests for rounding.
- [x] Remove the hardcoded ₦1,000 minimum; the Stage 0 minimum of ₦0.01 applies.
- [x] One `formatNaira` helper used everywhere.
- [x] Fix date parsing: parse `YYYY-MM-DD` as a calendar date, not `new Date(value)`.
- [x] Receipt and invoice print pages show the school, session, term and payer.
- [x] Admin or bursar can **create invoices per student** from a fee template with line items and **cancel** invoices that have no successful or pending payments.
- [x] Bursar can record **manual payments** (cash and bank transfer) with a reference and `recorded_by` audit field.
- [x] Unit tests: invoice summary, partial, exact, over-payment, cancelled invoice; an opt-in Neon dev integration test verifies concurrent payments cannot overpay.

**Exit check:** two simultaneous payments on the same invoice cannot overpay. Totals on `/fees`, parent dashboard and bursar dashboard are identical for the same family.

---

## Stage 5: Teacher scores

- [x] Replace `lib/scores/data.ts` with real queries against `subjects`, `teacher_assignments` and `scores`.
- [x] Use the session user as the teacher. `TEMP_TEACHER_ID` is removed.
- [x] Only list the classes and subjects the teacher is assigned to (per assignment row). Admin can see all.
- [x] Single source for CA/Exam maximums and grade bands (per D1). Score entry and report sheets share `lib/scores/grading.ts`.
- [x] Always recompute total and grade on the server. Never store client-sent values.
- [x] Atomic upsert of the submitted class scores in one transaction.
- [x] Lock rule: reject edits when `results_published` is true for that class, session and term. The save transaction checks the real table; publish and save share a transaction lock.
- [x] Show saved status, last saved time, and per-row errors.
- [x] Handle blank vs 0 (blank rows are skipped; zero is saved as a score).
- [x] Move the page under `/dashboard/teacher/scores` and link it from the teacher dashboard; the previous route redirects.
- [ ] Optional (P2): CSV import for scores.

**Exit check:** scores survive a server restart; a teacher cannot read or write a class they are not assigned to; publishing a class locks entry.

---

## Stage 6: Results and report sheets

- [x] Rewrite results data access in `lib/results/getResults.ts` to query `scores`, `subjects`, `students`, `results_published`. Only return **published** results to parents.
- [x] Compute **class position** from real scores (same score-recorded class, session and term). Ties share competition rank (1, 1, 3).
- [x] Define average: sum of CA + exam totals divided by the number of subjects **with scores**.
- [x] Attendance on the report sheet comes from `attendance_records` plus term dates and "days school opened" from settings.
- [x] Remove teacher and principal comment fields from the PDF and on-screen report until real comments can be entered.
- [x] Report PDF route: current-session check, parent-owns-child check, published check. Sanitise the download filename.
- [x] Move results code to `lib/results/` and remove the duplicate `app/lib/results/` directory.
- [x] Selector shows only terms with scores that are published for that child.
- [x] Handle empty states: no scores yet, term not published, no child linked, and student changed class.
- [x] Test the PDF with 1 subject, 12 subjects, long names, and special characters.

**Exit check:** publishing a class in admin makes exactly those parents' results visible. The report PDF numbers match the on-screen numbers and the raw scores.

---

## Stage 7: Attendance

(Best-built feature. Light work.)

- [x] Restrict teachers to classes they teach through `teacher_assignments`; enforce this again inside the save transaction. Admin keeps full access.
- [x] Parents see **absent, late and excused** records plus a per-term summary (present days out of days open).
- [x] Provide the "days school opened" data from `academic_terms.days_school_was_open`; report and parent summaries use it.
- [x] Block marking on weekends and events flagged as school holidays in the calendar table.
- [x] Delete `app/attendance-preview` and `demo-data.ts`. The home page links to the real sign-in page.
- [x] Keep `app/attendance/_components` as the shared attendance UI folder; parent attendance list is renamed and status-aware.

**Exit check:** a teacher's mark appears on the right parent's page within one refresh, and report-sheet attendance matches.

---

## Stage 8: Parent dashboard (merge into one)

Currently three parent areas: `/dashboard`, `/parent/dashboard`, `/fees`.

- [x] Choose one home (`/dashboard`) and fold the useful parent dashboard content into it. Delete the `/parent/dashboard` route.
- [x] Remove the 600 ms fake loading delay, "Demo controls" panel, sample data banners, "Ruby House" and other fields without a data source.
- [x] Child switcher is driven by `parent_students` for the signed-in user.
- [x] Child summary shows the latest published result (or "not yet published"), billed/paid/balance/next due/overdue fees, and current-term attendance.
- [x] Latest notices come from `notices`; upcoming events come from `events`.
- [x] Link through to fees, results, attendance and receipts.
- [x] Reuse the Stage 4 fee summary helper so totals match everywhere.
- [x] Keep it light for slow data: server-rendered page with no new client bundle.
- [x] Empty states: no children linked, no invoices, no notices (and no upcoming events).
- [x] Match the style guide (navy, white, gold; Poppins and Inter). Load fonts once in the root layout.

**Exit check:** a seeded parent sees only their children, with numbers identical to the fees pages.

---

## Stage 9: Bursar dashboard (merge into one)

- [x] Keep `/dashboard/bursar` protected and port the useful parts of `/bursar` into it. The old screen is removed; `/bursar` redirects to the canonical page.
- [x] Filter by session and term (defaults to current).
- [x] Metrics use successful payments and non-cancelled invoices: billed, collected, outstanding, collection rate, overdue amount/count, collected today/this week, and outstanding by class.
- [x] Debtors list includes student, class, linked parent contact, invoice count, balance and overdue days; supports server-side sorting, search and class filter.
- [x] Payments list includes receipt links, method and status; supports date range filtering.
- [x] **Export CSV** with naira amounts and dates; the server applies the active filters.
- [x] **Send reminder:** selected debtors' linked parents receive email at their account address. Delivery status is recorded with a per-parent/student/day uniqueness guard. The fake browser-only confirmation is removed.
- [x] Keep the page focused on daily bursar work; invoice creation and manual payments remain available in a collapsed section.

**Exit check:** bursar numbers reconcile with the sum of parent-side balances for every seeded family.

---

## Stage 10: School admin

- [x] Full server-side CRUD with admin-role checks and validation for classes, students (generated admission numbers), teacher/parent accounts (role updates and password resets), subjects, teacher assignments, parent ↔ student links, and class teachers.
- [x] Remove the fake `/admin/classes` client-state page.
- [x] Session and term settings page with current session/term, term dates and days open.
- [x] Results publishing shows score progress per class and term, blocks incomplete results, and supports publish/unpublish while preserving the Stage 5 lock.
- [x] **Publish order fix:** publishing succeeds independently; parent email is a separate, retryable action with visible results.
- [x] Safe deletes protect linked school history; student exits use graduated/withdrawn status.
- [x] Promotion tool moves active students from a class into a class in the next session (P2).
- [x] Admissions review lists applications and updates their status.

**Exit check:** starting from an empty database, an admin can set up a whole school through the UI with no seed.

The admin manage page now includes an ordered, live progress guide through the setup forms. The guide rendered successfully in the production route smoke check against seeded dev data; the no-seed UI walkthrough still needs a dedicated empty database before closing Stage 10.

---

## Stage 11: Notices, email and webhooks

- [ ] Verify a sending domain in Resend. `onboarding@resend.dev` only delivers to the account owner.
- [x] One `sendEmail()` helper (timeout, error handling, logging). Use it everywhere.
- [x] Notice flow: admin composes → saved to `notices` → emailed to the right audience (all parents, one class, one parent) → shown on the parent dashboard.
- [x] Remove the "first parent in the database" greeting logic. Send individually, using each parent's own name.
- [x] Keep a test mode: when `NOTICE_TEST_TO` is set, redirect all emails there, but only in non-production.
- [x] Email log table (to, subject, status, error) and a visible failure list for the admin.
- [x] Templates: results published, fee receipt, fee reminder, notice, admissions received.
- [x] Send the **fee receipt email** (replace `sendReceiptEmailLater`).
- [x] Webhook endpoint(s) (Paystack in Stage 13; Resend events optional).
- [~] Batch and rate-limit sends to stay inside Resend limits (shared sender queues sends with a 600 ms minimum start interval per process; no shared cross-instance limiter).

Implementation is in place. The sending domain and real inbox delivery need verification in Resend, and cross-instance batch pacing remains. Migrations through `0015_silky_onslaught.sql` have now applied successfully.

**Exit check:** a notice created by admin reaches real test inboxes, appears on the parent dashboard, and failures are visible.

---

## Stage 12: Online admissions

- [x] Replace the client-only form with a real submit: validate on the server and save to `applications`.
- [x] Applicant/guardian self-sign-up is restricted to the applicant role, requires verified email and a 12-character password; login opens the applicant account dashboard.
- [~] Deliver and click the verification email through the configured Resend domain; the external destination has not been confirmed.
- [x] Require the verified account email when submitting an application; show each user's own application, review/payment status, retry payment and confirmed pass slip.
- [x] Add Back navigation between application steps while retaining entered fields and selected uploads in the current form session.
- [x] Generate the application number on the server (unique, sequential or random with collision check).
- [x] **Document uploads** to private storage (Postgres bytea). Check type, signature and size on the server. Serve only through an administrator-authorised route.
- [x] Save draft: persist, with a resume link or code (or remove the button). The fake Save draft control was removed.
- [x] Application fee through Paystack (Stage 13); mark the application "paid" only from the verified webhook.
- [x] Confirmation page and email with the reference number. The pass slip can be printed or saved as PDF from the browser print dialog.
- [x] Admin/admissions view: list, filter by status, open an application, view documents, change status (received, reviewed, admitted, rejected), add notes.
- [~] Protect against spam (rate limit, honeypot or captcha). Honeypot and per-process IP throttling are in place; durable shared rate limiting remains.
- [x] Privacy: store only what is needed. Applicant documents are private and admin-authorized.

Implementation is in place. Migration `0012_round_network.sql` adds private document bytes and staff notes. Admissions checkout is configured for ₦80,000, records checkout attempts and payment status, supports resuming checkout, and only marks the application paid after verified Paystack confirmation. Migration `0016_curved_morg.sql` allows the applicant role and was applied to the linked development branch. Seeded applicant login and route boundaries are smoke-tested; real inbox verification and end-to-end test-card/webhook confirmation remain open.

**Exit check:** a test application with documents and a test fee appears in admin, and the applicant gets an email.

---

## Stage 13: Paystack (test mode)

- [x] Initialise transaction server-side (amount from the invoice balance computed on the server, never from the browser).
- [x] Redirect to checkout, then a callback page that **verifies** the transaction with Paystack before showing success.
- [x] **Webhook route:** verify the `x-paystack-signature` HMAC with the secret key, handle `charge.success`, be idempotent (unique reference), write the payment in the same transaction as the Stage 4 balance guard.
- [x] Handle pending, failed, abandoned, and duplicate callbacks.
- [x] Reuse the same receipt, status and email logic as manual payments.
- [x] Test mode only: banner in the UI, no live keys anywhere in the repo; the server rejects a non-test secret key.
- [x] Local HTTP payment callbacks are allowed only for loopback hosts while the Paystack test key is enforced; production hosts still require HTTPS.
- [x] When the test secret is active, email delivery redirects to the configured test inbox, including when the local portal runs a production build.
- [x] Smoke-check payment resumption input validation and rejection of unsigned Paystack webhook events.
- [x] Offline Paystack client tests cover test-key enforcement, server amount/callback payload, no-store verification and exact test transaction matching.
- [ ] Use Paystack's test cards for success, decline and insufficient funds.
- [ ] Exposed webhook URL for local testing (tunnel) and a Vercel preview URL set in the Paystack dashboard.

Implementation is in place. Migrations through `0016_curved_morg.sql` applied successfully to the linked development branch, and a Paystack test secret is configured. Invoice and admissions checkout use hosted Paystack checkout and the webhook verifies payment before updating records. Offline key/payload/verification checks and unsigned-event rejection pass. A completed Paystack test-card checkout and public webhook delivery still need end-to-end verification.

**Exit check:** a test payment through Paystack updates the invoice, creates one receipt, and emails the parent, even if the callback and webhook both fire.

---

## Stage 14: Public website (Astro)

- [x] "Apply now" goes to the admissions form in the Next app (absolute URL from `PUBLIC_PORTAL_URL`).
- [x] Add a "Parent login" link to the portal in the header and footer.
- [x] Add a dedicated SchoolDesk platform page explaining the current parent, teacher and school-team portal features.
- [x] Align the public admissions fee with the portal's ₦80,000 setting and remove the unverified fixed entrance-exam date.
- [~] Replace placeholders: phone number, email, address, map, social links. Fake phone/email values removed; fields use optional public env values. Verified details still need to be supplied before launch.
- [x] Session text ("2027/2028") matches D2/D3.
- [x] News page reads from a Markdown collection; existing notices moved into Markdown content files.
- [x] SEO: titles, descriptions, Open Graph, sitemap, `robots.txt`, canonical URLs.
- [x] Decide hosting: separate Vercel project for `website/` with root directory set. Documented in `website/README.md`.
- [ ] Performance check on a throttled mobile connection.

**Exit check:** a visitor can go from the public site to a submitted application and to the login page without a dead end.

---

## Stage 15: Cleanup, QA and release

Cleanup:

- [x] Remove the empty `notepad` file, correct stale attendance/login docs, and confirm old bursar/score URLs are redirects to the canonical dashboard routes. A broader unused-component audit is deferred to Later.
- [x] Home page introduces Crown Heights Academy and its SchoolDesk family portal; `/platform` explains the portal and has a direct sign-in link.
- [x] Shared role-aware dashboard navigation provides each role's main screens; fee pages include a dashboard return link and a visible two-by-two mobile navigation grid.
- [x] Use mobile cards for admin result progress and bursar debtors/payments; show compact two-column fee metrics on phone screens, with the balance summary spanning both columns.
- [x] Remove `console.log` noise and demo-login output from the seed command; hide the development/test checkout banner in production. No sample-data copy remains in the user interface.

QA (by role, on a phone-width screen first):

- [~] **Parent:** seeded sign-in, dashboard, attendance and fees routes load; parent-to-child ownership passed the dev database check. Payment/receipt/results/notices interactions are deferred to Later.
- [~] **Teacher:** seeded sign-in, teacher dashboard, scores and attendance routes load; cross-role denial is checked. Form interactions and narrow-screen review are deferred to Later.
- [~] **Bursar:** seeded sign-in and bursar dashboard route load; cross-role denial is checked. Payments/export/reminder interactions and narrow-screen review are deferred to Later.
- [~] **Admin:** seeded sign-in, admin dashboard, admissions/manage/settings routes load; admin cross-role access is checked. Setup/publish/notices interactions and narrow-screen review are deferred to Later.
- [~] **Negative tests:** wrong-role access, malformed student IDs and another parent's student ID are covered. Tampered requests, expired sessions and duplicate payment submission are deferred to Later.
- [~] Accessibility: keyboard, contrast, tap size and labels are deferred to Later with the phone-width review.
- [x] Add automated money, grading and ownership validation tests using Vitest; the database ownership integration test also passed on the dev branch.
- [x] Add and run `npm run smoke:routes` against the seeded app; each role's routes and role boundary were checked.

Release:

- [~] Production release was not performed; the production setup and merge checks are moved to Later until domains, credentials and service access are available.

**Exit check:** every item above is ticked or consciously deferred (move it to "Later").

---

## Later (deferred on purpose)

- [ ] Full mobile-width, accessibility, and end-to-end role walkthroughs, including Paystack success/failure, receipt, report PDF, notices, reset/expired sessions, tampered requests, and duplicate payment submission.
- [ ] Audit and remove any genuinely unused components after the release UI is frozen.
- [ ] Review remaining moderate npm audit findings in the development-tool dependency chain; current remediation suggestion is a breaking Drizzle Kit downgrade.
- [ ] Provision the production Neon branch and apply migrations without demo seed data.
- [ ] Configure Vercel production/preview domains and secrets, including `BETTER_AUTH_URL` and exact `BETTER_AUTH_TRUSTED_ORIGINS`.
- [ ] Create the first real admin through a one-time script after the production branch is ready.
- [ ] Confirm production error monitoring and database backups.
- [ ] Complete release review and merge to `main` only after the production checks pass.
- [ ] Timetable, calendar sync, SMS notices, parent-teacher messaging
- [ ] Student promotion and graduation workflows
- [ ] Multi-term cumulative results and annual report
- [ ] Offline-friendly PWA

## Build errors log

_(Fill in during Stage 0.)_

| # | Command | Error | Status |
|---|---------|-------|--------|
| 1 | `npm ci` | Registry DNS failure (`ENOTFOUND registry.npmjs.org`, missing `zod-validation-error-4.0.2.tgz`) on the first sandbox attempt; succeeded after approved network access. | Resolved |
| 2 | `npm run build` | Google Fonts could not be fetched in the sandbox; initial Turbopack CSS worker also failed with the Turbopack-only Tailwind loader. | Resolved by approved network access and replacing the loader with Tailwind's PostCSS plugin |
| 3 | `npm run build -- --webpack` | `A4_PRINT_CSS` export is not allowed from a Next page module. | Resolved by making the constant module-private |
| 4 | `npm run lint` | `react/no-children-prop` in the results selector. | Resolved by renaming the prop to `childOptions` |
| 5 | `npm run build` | Better Auth reported its default secret and missing base URL during prerender. | Resolved by adding a fresh local-only `BETTER_AUTH_SECRET` and localhost URL settings to ignored `.env.local` |
| 6 | `npm run build -- --webpack` | Reproduced: the build compiled and passed TypeScript, then Windows returned `EPERM` creating `.next/server/app/reset-password` before compilation (also previously reproduced during prerender under `.segments`). | Unresolved environment/filesystem error; no application type errors reported |
| 7 | `npm run build` | Turbopack worker process exited before connecting while processing `app/globals.css`. | Unresolved sandbox process error; Webpack compiled the app and passed TypeScript |
| 8 | `npm run build` | Next TypeScript pass included Astro website source and could not resolve Astro types/environment variables. | Resolved by excluding `website/` from the Next TypeScript project |
| 9 | `npm run build` | Windows sandbox returned `EPERM` creating `.next/server/app/api`. | Resolved by running the authorized build with workspace file access |
| 10 | `npm run test:vitest` | Vitest could not rename a temporary transform file under the sandbox's external temp directory. | Resolved by placing Vitest temporary files under ignored workspace `.tmp/` |
| 11 | `npm install --save-dev vitest` | Latest Vitest required newer Node types than the project's `@types/node@20`. | Resolved by using patched Vitest 4.1.12, which supports the current Node type baseline |

## Progress

| Stage | Name | Status |
|-------|------|--------|
| 0 | Decisions and baseline | [x] |
| 1 | Security foundation | [x] |
| 2 | Schema and data model | [x] |
| 3 | Environment and seed | [x] |
| 4 | Fees and payments | [x] |
| 5 | Teacher scores | [x] |
| 6 | Results and report sheets | [x] |
| 7 | Attendance | [x] |
| 8 | Parent dashboard | [x] |
| 9 | Bursar dashboard | [x] |
| 10 | School admin | [~] |
| 11 | Notices, email, webhooks | [ ] |
| 12 | Online admissions | [~] |
| 13 | Paystack (test) | [~] |
| 14 | Public website | [~] |
| 15 | Cleanup, QA, release | [~] |
