# Login, roles and notices

How the school portal's sign-in, roles and parent notices work, and how to run
everything locally.

## What the login does

- `/login` shows the school name, an email field, a password field, a
  **Sign in** button and a **Forgot your password?** link.
- The reset link opens a reset request flow; an administrator must
  configure `RESEND_API_KEY` and `RESEND_FROM` before reset emails can be sent.
- Sign-in is handled by Better Auth (email + password) at `/api/auth/*`.
- The role of each account is stored on the Better Auth `user` table
  (`role` column). The role is checked **on the server**, before a page
  renders, so no page content ever flashes for the wrong role.
- After a successful sign-in, each role is sent straight to its own page.
- New applicant/guardian accounts register at `/admissions/register`, receive an email-verification link, and sign in with a 12-character-minimum password. Public registration can only create the `applicant` role; staff and parent accounts remain admin-managed.
- Applicant accounts use the verified parent/guardian email to submit applications and track payment and review status at `/dashboard/applicant`.
- Signed-out visitors who open a dashboard page are redirected to `/login`.
- Any signed-in person who opens another role's page sees:
  **"You do not have permission to open this page."** with a
  **Back to my dashboard** button.
- **Sign out** clears the session and does a full page load to `/login`.

## The five roles

| Role    | Email                | Password |
| ------- | -------------------- | -------- |
| Parent  | `parent@example.com` | Set locally with `DEMO_PASSWORD` |
| Teacher | `teacher@example.com`| Set locally with `DEMO_PASSWORD` |
| Bursar  | `bursar@example.com` | Set locally with `DEMO_PASSWORD` |
| Admin   | `admin@example.com`  | Set locally with `DEMO_PASSWORD` |
| Applicant | `applicant@example.com` | Set locally with `DEMO_PASSWORD` |

The parent account is linked to the sample children through the shared
`parent_students` table, so the parent sees only their own children.
The demo accounts are for local development only. Choose a unique password;
the unified seed refuses to run in production and never prints the password.

## Which pages each role can open

| Page                               | Parent | Teacher | Bursar | Admin |
| ---------------------------------- | :----: | :-----: | :----: | :---: |
| `/dashboard`                       |   ✓    |   ✗     |   ✗    |   ✓   |
| `/dashboard/attendance`            |   ✓    |   ✗     |   ✗    |   ✗   |
| `/dashboard/teacher`               |   ✗    |   ✓     |   ✗    |   ✓   |
| `/dashboard/teacher/attendance`    |   ✗    |   ✓     |   ✗    |   ✓   |
| `/dashboard/bursar`                |   ✗    |   ✗     |   ✓    |   ✓   |
| `/dashboard/admin`                 |   ✗    |   ✗     |   ✗    |   ✓   |

The admin page also links to the other three pages.

## Notices

- On the parent page the text **"School notices will also be sent to your
  email."** explains that notices arrive by email.
- On the admin page, **Send notice** emails a notice (a title and a message)
  through Resend. The email subject is the admin's title and the body greets
  the parent by their name on record, followed by the message,
  "Thank you." and "Crown Heights Academy".
- On success the admin sees **"Notice sent."**; on failure,
  **"We could not send the notice. Please try again."**

## Environment variables (names only)

Set these in `.env.local` (copy `.env.example`):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `NOTICE_TEST_TO`
- `DEMO_PASSWORD` (local development only; required by the seed command)

## How to run it

```bash
npm install
# create .env.local with the variables above
npm run db:migrate      # applies the schema before seeding
npm run db:seed         # creates accounts and the shared sample dataset
npm run dev             # http://localhost:3000/login
```

`npm run db:seed` only runs against the linked Neon `dev` branch and never prints
the password or other secrets. `npm run db:reset-dev` removes and rebuilds the
fixed sample records on that branch; it refuses to run in production.
