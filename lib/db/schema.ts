import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  jsonb,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth owns the login/user tables. parent_students only stores the
// parent's Better Auth user id, so there is no foreign key to a users table.

// ---------------------------------------------------------------------------
// Feature 10: login, roles and security.
// These four tables are the standard Better Auth tables (user, session,
// account, verification). Added with the team's agreement for Feature 10.
// The extra `role` column on `user` decides what each signed-in person sees.
// ---------------------------------------------------------------------------
export const ROLES = ["parent", "teacher", "bursar", "admin", "applicant"] as const;
export type Role = (typeof ROLES)[number];

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Which portal role this account has (Feature 10). */
  role: text("role").notNull().default("parent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("user_role_check", sql`${table.role} in ('parent', 'teacher', 'bursar', 'admin', 'applicant')`)]);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------

export const invoiceStatus = pgEnum("invoice_status", [
  "unpaid",
  "partial",
  "paid",
  "overdue",
  "cancelled",
]);

export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "card",
  "paystack",
  "other",
  "test",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
]);
export const feeReminderStatus = pgEnum("fee_reminder_status", ["pending", "sent", "failed"]);
export const emailStatus = pgEnum("email_status", ["sent", "failed"]);

export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const scoreTerm = pgEnum("score_term", ["first", "second", "third"]);
export type ScoreTerm = (typeof scoreTerm.enumValues)[number];
export const studentStatus = pgEnum("student_status", ["active", "graduated", "withdrawn"]);
export const noticeAudience = pgEnum("notice_audience", ["all_parents", "class", "individual"]);
export const applicationStatus = pgEnum("application_status", ["submitted", "under_review", "accepted", "rejected"]);
export const applicationFeeStatus = pgEnum("application_fee_status", ["unpaid", "pending", "paid"]);
export const applicationDocumentType = pgEnum("application_document_type", ["birth_certificate", "last_school_report", "passport_photograph", "other"]);
const privateDocumentBytes = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export type AttendanceStatus = (typeof attendanceStatus.enumValues)[number];

export const academicSessions = pgTable("academic_sessions", {
  name: text("name").primaryKey(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
}, (table) => [
  check("academic_sessions_date_order_check", sql`${table.startsOn} < ${table.endsOn}`),
  check("academic_sessions_name_format_check", sql`${table.name} ~ '^[0-9]{4}/[0-9]{4}$'`),
]);

export const academicTerms = pgTable("academic_terms", {
  session: text("session").notNull().references(() => academicSessions.name, { onDelete: "cascade" }),
  term: scoreTerm("term").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  daysSchoolWasOpen: integer("days_school_was_open").notNull().default(0),
}, (table) => [
  primaryKey({ columns: [table.session, table.term] }),
  check("academic_terms_date_order_check", sql`${table.startsOn} < ${table.endsOn}`),
  check("academic_terms_days_open_check", sql`${table.daysSchoolWasOpen} >= 0`),
]);

export const schoolSettings = pgTable("school_settings", {
  id: integer("id").primaryKey().default(1),
  currentSession: text("current_session").notNull().references(() => academicSessions.name, { onDelete: "restrict" }),
  currentTerm: scoreTerm("current_term").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("school_settings_singleton_check", sql`${table.id} = 1`),
  foreignKey({ columns: [table.currentSession, table.currentTerm], foreignColumns: [academicTerms.session, academicTerms.term] }).onDelete("restrict"),
]);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    level: text("level"),
    academicYear: text("academic_year").notNull(),
      classTeacherUserId: text("class_teacher_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("classes_name_academic_year_idx").on(
      table.name,
      table.academicYear,
    ),
      index("classes_class_teacher_user_id_idx").on(table.classTeacherUserId),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    admissionNumber: text("admission_number").notNull().unique(),
    dateOfBirth: date("date_of_birth"),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    status: studentStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("students_class_id_idx").on(table.classId)],
);

export const parentStudents = pgTable(
  "parent_students",
  {
    parentUserId: text("parent_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull().default("guardian"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.parentUserId, table.studentId] }),
    index("parent_students_parent_user_id_idx").on(table.parentUserId),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attendanceDate: date("attendance_date").notNull(),
    status: attendanceStatus("status").notNull(),
    note: text("note"),
    // Better Auth owns the user table, so keep only its user ID here.
    markedBy: text("marked_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    markedAt: timestamp("marked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_records_student_date_idx").on(
      table.studentId,
      table.attendanceDate,
    ),
    index("attendance_records_date_idx").on(table.attendanceDate),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    status: invoiceStatus("status").notNull().default("unpaid"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),
    title: text("title"),
    session: text("session").notNull().references(() => academicSessions.name, { onDelete: "restrict" }),
    term: scoreTerm("term").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoices_student_id_idx").on(table.studentId),
    index("invoices_status_idx").on(table.status),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").default("Fees"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("invoice_items_invoice_id_idx").on(table.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method: paymentMethod("method").notNull().default("bank_transfer"),
    reference: text("reference"),
    paystackReference: text("paystack_reference").unique(),
    authorizationUrl: text("authorization_url"),
    rawEvent: jsonb("raw_event"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    receiptNumber: text("receipt_number").unique(),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }),
    status: paymentStatus("status").notNull().default("success"),
    paidAt: timestamp("paid_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_invoice_id_idx").on(table.invoiceId),
    uniqueIndex("payments_reference_unique_idx").on(table.reference),
    check("payments_amount_positive_check", sql`${table.amount} > 0`),
  ],
);

export const receiptCounters = pgTable("receipt_counters", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
}, (table) => [check("receipt_counters_last_number_nonnegative_check", sql`${table.lastNumber} >= 0`)]);

export const feeReminderLogs = pgTable("fee_reminder_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentUserId: text("parent_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  reminderDate: date("reminder_date").notNull(),
  status: feeReminderStatus("status").notNull().default("pending"),
  sentBy: text("sent_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("fee_reminder_logs_recipient_student_date_idx").on(table.parentUserId, table.studentId, table.reminderDate),
  index("fee_reminder_logs_status_idx").on(table.status),
]);

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type ParentStudent = typeof parentStudents.$inferSelect;
export type NewParentStudent = typeof parentStudents.$inferInsert;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Feature 10: auth types
export type AuthUser = typeof user.$inferSelect;
export type NewAuthUser = typeof user.$inferInsert;
export type AuthSession = typeof session.$inferSelect;
export type NewAuthSession = typeof session.$inferInsert;

// ---------------------------------------------------------------------------
// Feature 6 + 9: scores, subjects, teacher assignments and per-class results
// publication. Copied verbatim from
// origin/feature/teacher-scores:lib/scores/proposed-schema.ts
// (agreed shape: keep these column names so the teacher-scores and
// results-report-sheets features can share them). Publishing is per class and
// term in `results_published`; scores rows are never published individually.
// ---------------------------------------------------------------------------

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherUserId: text("teacher_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("teacher_assignments_unique_idx").on(
      table.teacherUserId,
      table.classId,
      table.subjectId,
    ),
    index("teacher_assignments_class_id_idx").on(table.classId),
  ],
);

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    session: text("session").notNull().references(() => academicSessions.name, { onDelete: "restrict" }),
    term: scoreTerm("term").notNull(),
    caScore: numeric("ca_score", { precision: 5, scale: 2 }).notNull(),
    examScore: numeric("exam_score", { precision: 5, scale: 2 }).notNull(),
    total: numeric("total", { precision: 5, scale: 2 }).notNull(),
    grade: text("grade").notNull(),
    enteredBy: text("entered_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("scores_ca_range_check", sql`${table.caScore} >= 0 and ${table.caScore} <= 40`),
    check("scores_exam_range_check", sql`${table.examScore} >= 0 and ${table.examScore} <= 60`),
    uniqueIndex("scores_student_subject_session_term_idx").on(
      table.studentId,
      table.subjectId,
      table.session,
      table.term,
    ),
    index("scores_class_session_term_idx").on(table.classId, table.session, table.term),
  ],
);

export const resultsPublished = pgTable(
  "results_published",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id").notNull(),
    session: text("session").notNull().references(() => academicSessions.name, { onDelete: "restrict" }),
    term: scoreTerm("term").notNull(),
    published: boolean("published").notNull().default(false),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.classId], foreignColumns: [classes.id] }).onDelete("cascade"),
    uniqueIndex("results_published_class_session_term_idx").on(
      table.classId,
      table.session,
      table.term,
    ),
    index("results_published_published_by_idx").on(table.publishedBy),
    check("results_published_metadata_check", sql`not ${table.published} or (${table.publishedBy} is not null and ${table.publishedAt} is not null)`),
  ],
);

export const notices = pgTable("notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: noticeAudience("audience").notNull(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("notices_class_audience_check", sql`(${table.audience} = 'class' and ${table.classId} is not null) or (${table.audience} <> 'class' and ${table.classId} is null)`),
  index("notices_created_at_idx").on(table.createdAt),
]);

export const noticeReads = pgTable("notice_reads", {
  noticeId: uuid("notice_id").notNull().references(() => notices.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.noticeId, table.userId] })]);

export const noticeRecipients = pgTable("notice_recipients", {
  noticeId: uuid("notice_id").notNull().references(() => notices.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.noticeId, table.userId] }), index("notice_recipients_user_idx").on(table.userId)]);

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  status: emailStatus("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("email_logs_status_created_idx").on(table.status, table.createdAt)]);

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceNumber: text("reference_number").notNull().unique(),
  childFullName: text("child_full_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  classApplyingFor: text("class_applying_for").notNull(),
  parentFullName: text("parent_full_name").notNull(),
  parentPhoneNumber: text("parent_phone_number").notNull(),
  parentEmail: text("parent_email").notNull(),
  status: applicationStatus("status").notNull().default("submitted"),
  feeStatus: applicationFeeStatus("fee_status").notNull().default("unpaid"),
  feeAmount: numeric("fee_amount", { precision: 12, scale: 2 }),
  feePaidAt: timestamp("fee_paid_at", { withTimezone: true }),
  staffNotes: text("staff_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("applications_status_created_idx").on(table.status, table.createdAt),
  check("applications_fee_amount_positive_check", sql`${table.feeAmount} is null or ${table.feeAmount} > 0`),
  check("applications_fee_state_check", sql`${table.feeStatus} not in ('pending', 'paid') or (${table.feeAmount} is not null and ${table.feeAmount} > 0)`),
  check("applications_fee_paid_at_check", sql`${table.feeStatus} <> 'paid' or ${table.feePaidAt} is not null`),
]);

export const applicationDocuments = pgTable("application_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull().unique(),
  type: applicationDocumentType("type").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: privateDocumentBytes("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("application_documents_size_positive_check", sql`${table.sizeBytes} > 0`),
  index("application_documents_application_idx").on(table.applicationId),
]);

export const applicationPayments = pgTable("application_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  reference: text("reference").notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: paymentStatus("status").notNull().default("pending"),
  authorizationUrl: text("authorization_url"),
  rawEvent: jsonb("raw_event"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("application_payments_amount_positive_check", sql`${table.amount} > 0`),
  index("application_payments_application_created_idx").on(table.applicationId, table.createdAt),
]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isSchoolHoliday: boolean("is_school_holiday").notNull().default(false),
  audience: noticeAudience("audience").notNull().default("all_parents"),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("events_date_order_check", sql`${table.endsAt} is null or ${table.startsAt} < ${table.endsAt}`),
  index("events_starts_at_idx").on(table.startsAt),
]);

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type TeacherAssignment = typeof teacherAssignments.$inferSelect;
export type NewTeacherAssignment = typeof teacherAssignments.$inferInsert;
export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
export type ResultsPublished = typeof resultsPublished.$inferSelect;
export type NewResultsPublished = typeof resultsPublished.$inferInsert;
