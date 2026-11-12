# Login, roles and notices

How the school portal's sign-in, roles and parent notices work, and how to run
everything locally.

## What the login does

- `/login` shows the school name, an email field, a password field and a
  **Sign in** button. Nothing else.
- Sign-in is handled by Better Auth (email + password) at `/api/auth/*`.
- The role of each account is stored on the Better Auth `user` table
  (`role` column). The role is checked **on the server**, before a page
  renders, so no page content ever flashes for the wrong role.
- After a successful sign-in, each role is sent straight to its own page.
- Signed-out visitors who open a dashboard page are redirected to `/login`.
- Any signed-in person who opens another role's page sees:
  **"You do not have permission to open this page."** with a
  **Back to my dashboard** button.
- **Sign out** clears the session and does a full page load to `/login`.

## The four roles

| Role    | Email                | Password      |
| ------- | -------------------- | ------------- |
| Parent  | `parent@example.com` | `CHADemo2027!` |
| Teacher | `teacher@example.com`| `CHADemo2027!` |
| Bursar  | `bursar@example.com` | `CHADemo2027!` |
| Admin   | `admin@example.com`  | `CHADemo2027!` |

The parent account is linked to the sample children through the shared
`parent_students` table, so the parent sees only their own children.
The password is a shortcut for the team's local environment, not real security.

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

Set these in `.env` (copy `.env.example`):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `NOTICE_TEST_TO`

## How to run it

```bash
npm install
# create .env with the variables above
npm run db:generate     # writes SQL for pending schema changes
npm run db:migrate      # applies them to the database
npm run db:demo-users   # creates the four accounts (safe to re-run)
npm run dev             # http://localhost:3000/login
```

`npm run db:demo-users` only inserts rows into the Better Auth tables
(`user`, `account`); it is not the shared seed script and it never prints
any secret.
