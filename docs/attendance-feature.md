# Attendance feature

## Goal

Let a teacher record daily attendance for a class and let a parent see absence
records for only their linked children. The feature should work well on a
phone, use clear language, and save attendance to the shared database.

## Implemented first release

- Teacher selects a class and date, sees its students, and marks each Present,
  Absent, Late, or Excused. A “Mark everyone present” shortcut speeds up a
  normal day; the teacher can then correct individual exceptions.
- A student with no saved record remains Unmarked. Do not silently treat an
  unmarked student as present or absent.
- Teacher can save a class list and correct a saved record for the same date.
- Parent dashboard shows each linked child's absences with date and class; it
  does not expose other students or teacher-only controls.
- Admin can use the staff marking page and has an admin-only all-class selector.

## Data model (group-approved)

Add an `attendance_status` enum (`present`, `absent`, `late`, `excused`) and an
`attendance_records` table with:

- `id` UUID primary key
- `student_id` foreign key to `students.id`
- `attendance_date` date
- `status` enum
- optional `note` text, limited to a short operational note (no sensitive
  medical details)
- `marked_by` Better Auth user ID and `marked_at` timestamp
- unique index on (`student_id`, `attendance_date`) plus a date index for
  daily roster lookups

This keeps the attendance table focused and reuses the existing `classes`,
`students`, and `parent_students` tables. The parent access query must join
through `parent_students` using the authenticated parent's user ID. The UI
must never accept a parent ID from the browser as proof of access.

## Pages and flow

1. Teacher attendance page (`/dashboard/teacher/attendance`): choose date and
   class, mark students, review unmarked count, and save.
2. Parent attendance page (`/dashboard/attendance`): show linked children's
   absence dates, newest first, with an empty state and 50-record pagination.
3. Admin overview with class/date filters and daily counts is not implemented;
   the admin can use the teacher marking page.

Both pages use Feature 10's `requireRole` helper. Teacher saves recheck the
teacher/admin role in the server action. Parent absence queries use the
authenticated user's ID to filter through `parent_students`.

The schema migration is `drizzle/0002_cultured_groot.sql`, following the
login-security migration. Apply migrations and load the shared sample data
before exercising the feature against a database.

## Accessibility and mobile review checklist

- Keep the roster usable at narrow widths without a wide, horizontally
  scrolling table.
- Use explicit labels for class/date selection and status controls; do not
  communicate status by color alone.
- Use a darker gold on white for the section labels and visible focus rings.
- Make each control keyboard operable with visible focus and comfortable touch
  targets.
- Announce save success and validation errors to assistive technology.
- Keep the initial parent view compact and quick to load on slow connections.

## Remaining integration decisions

- Teachers can mark only classes assigned through `teacher_assignments` or
  where they are the class teacher; the save action rechecks this in the
  transaction.
- Whether same-day edits need an audit trail beyond the latest marker/time.
- A separate admin attendance analytics overview remains a future feature.
