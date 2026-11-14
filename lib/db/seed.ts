import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { hashPassword } from "better-auth/crypto";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "type" in error) {
    return `Database connection failed (${String(error.type)} event).`;
  }
  return String(error);
}

async function main() {
const { db } = await import("./index");
const schema = await import("./schema");
const { inArray, or, sql } = await import("drizzle-orm");

const sessionName = "2026/2027";
const wipe = process.argv.includes("--wipe");
const demoPassword = process.env.DEMO_PASSWORD;

const demoUsers = [
  { id: "sample-parent-user-001", name: "Adaeze Okafor", email: "parent@example.com", role: "parent", accountId: "sample-account-parent-001" },
  { id: "demo-teacher-user-001", name: "Bisi Adeyemi", email: "teacher@example.com", role: "teacher", accountId: "demo-account-teacher-001" },
  { id: "demo-bursar-user-001", name: "Kelechi Obi", email: "bursar@example.com", role: "bursar", accountId: "demo-account-bursar-001" },
  { id: "demo-admin-user-001", name: "Grace Eze", email: "admin@example.com", role: "admin", accountId: "demo-account-admin-001" },
  { id: "demo-parent-user-002", name: "Nneka Bello", email: "parent2@example.com", role: "parent", accountId: "demo-account-parent-002" },
  { id: "demo-parent-user-003", name: "Tunde Yusuf", email: "parent3@example.com", role: "parent", accountId: "demo-account-parent-003" },
  { id: "demo-teacher-user-002", name: "Amaka Musa", email: "teacher2@example.com", role: "teacher", accountId: "demo-account-teacher-002" },
  { id: "demo-teacher-user-003", name: "Emeka Nwosu", email: "teacher3@example.com", role: "teacher", accountId: "demo-account-teacher-003" },
  { id: "demo-applicant-user-001", name: "Demo Applicant", email: "applicant@example.com", role: "applicant", accountId: "demo-account-applicant-001" },
] as const;

function uuidAt(value: number): string {
  return `c0000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
}

const classRows = [
  { id: "c0000000-0000-4000-8000-000000000001", name: "JSS 1A", level: "JSS 1" },
  { id: "c0000000-0000-4000-8000-000000000002", name: "JSS 2B", level: "JSS 2" },
  { id: uuidAt(3), name: "JSS 3A", level: "JSS 3" },
].map((row) => ({ ...row, academicYear: sessionName }));

const subjectNames = [
  "Mathematics", "English Language", "Basic Science", "Social Studies",
  "Computer Studies", "Civic Education", "Business Studies", "French",
];
const subjectRows = subjectNames.map((name, index) => ({ id: uuidAt(2000 + index), name }));

const studentNames = [
  ["Chidi", "Okafor"], ["Amina", "Okafor"], ["Tunde", "Bello"], ["Zainab", "Yusuf"], ["Chidera", "Okafor"], ["Ifeoma", "Obi"],
  ["Ngozi", "Okafor"], ["Emeka", "Adeyemi"], ["Fatima", "Musa"], ["Somto", "Bello"], ["Kene", "Eze"], ["Amara", "Nwosu"],
  ["Ada", "Yusuf"], ["Chuka", "Obi"], ["Laila", "Danjuma"], ["Obinna", "Musa"], ["Nneka", "Adeyemi"], ["Tomiwa", "Balogun"],
] as const;
const classSize = 6;
const studentRows = studentNames.map(([firstName, lastName], index) => ({
  id: index === 0 ? "d0000000-0000-4000-8000-000000000001" : index === 6 ? "d0000000-0000-4000-8000-000000000002" : uuidAt(1000 + index),
  firstName,
  lastName,
  admissionNumber: `CHA/${sessionName.slice(0, 4)}/${String(index + 1).padStart(3, "0")}`,
  dateOfBirth: `${2011 + (index % 6)}-${String(1 + (index % 12)).padStart(2, "0")}-${String(3 + (index % 24)).padStart(2, "0")}`,
  classId: classRows[Math.floor(index / classSize)].id,
}));

const parentLinks = [
  { parentUserId: demoUsers[0].id, studentId: studentRows[0].id, relationship: "mother" },
  { parentUserId: demoUsers[0].id, studentId: studentRows[6].id, relationship: "mother" },
  { parentUserId: demoUsers[4].id, studentId: studentRows[1].id, relationship: "father" },
  { parentUserId: demoUsers[5].id, studentId: studentRows[7].id, relationship: "guardian" },
  { parentUserId: demoUsers[5].id, studentId: studentRows[8].id, relationship: "guardian" },
];

const assignments = classRows.flatMap((classRow, classIndex) => subjectRows.map((subject, subjectIndex) => ({
  id: uuidAt(3000 + classIndex * subjectRows.length + subjectIndex),
  teacherUserId: demoUsers[1 + (subjectIndex % 3)].id,
  classId: classRow.id,
  subjectId: subject.id,
})));

const invoiceSpecs = [
  { number: "INV-2026-0001", studentIndex: 0, status: "paid" as const, total: "150000.00", dueDate: "2026-10-01", paid: "150000.00" },
  { number: "INV-2026-0002", studentIndex: 6, status: "partial" as const, total: "200000.00", dueDate: "2026-12-15", paid: "50000.00" },
  { number: "INV-2026-0003", studentIndex: 1, status: "unpaid" as const, total: "125000.00", dueDate: "2026-12-15", paid: null },
  { number: "INV-2026-0004", studentIndex: 7, status: "overdue" as const, total: "90000.00", dueDate: "2026-09-30", paid: null },
  { number: "INV-2026-0005", studentIndex: 8, status: "cancelled" as const, total: "75000.00", dueDate: "2026-10-15", paid: null },
];
const invoicesRows = invoiceSpecs.map((spec, index) => ({
  id: index < 3 ? `e0000000-e000-4000-8000-00000000000${index + 1}` : uuidAt(5000 + index),
  studentId: studentRows[spec.studentIndex].id,
  invoiceNumber: spec.number,
  status: spec.status,
  issueDate: "2026-09-01",
  dueDate: spec.dueDate,
  totalAmount: spec.total,
  title: "School Fees — First Term",
  session: sessionName,
  term: "first" as const,
  notes: "Development sample invoice",
}));

const itemRows = invoiceSpecs.map((spec, index) => ({
  id: index < 5 ? `f0000000-f000-4000-8000-00000000000${index + 1}` : uuidAt(6000 + index),
  invoiceId: invoicesRows[index].id,
  description: index === 0 ? "Tuition and learning materials" : "First term school fees",
  quantity: 1,
  unitAmount: spec.total,
  amount: spec.total,
  category: "Fees",
}));

const paymentRows = [
  { id: "a0000000-0000-4000-8000-000000000001", invoiceId: invoicesRows[0].id, amount: "150000.00", method: "bank_transfer" as const, reference: "SAMPLE-TRANSFER-001", receiptNumber: "CHA-2026-0001", balanceAfter: "0.00", status: "success" as const, paidAt: new Date("2026-09-10T10:30:00.000Z") },
  { id: "a0000000-0000-4000-8000-000000000002", invoiceId: invoicesRows[1].id, amount: "50000.00", method: "paystack" as const, reference: "SAMPLE-PAYSTACK-002", receiptNumber: "CHA-2026-0002", balanceAfter: "150000.00", status: "success" as const, paidAt: new Date("2026-09-12T14:05:00.000Z") },
  { id: uuidAt(7002), invoiceId: invoicesRows[2].id, amount: "10000.00", method: "paystack" as const, reference: "SAMPLE-PAYSTACK-PENDING", status: "pending" as const, paidAt: new Date("2026-10-01T09:00:00.000Z") },
  { id: uuidAt(7003), invoiceId: invoicesRows[3].id, amount: "20000.00", method: "bank_transfer" as const, reference: "SAMPLE-TRANSFER-FAILED", status: "failed" as const, paidAt: new Date("2026-09-20T09:00:00.000Z") },
];

const scoreRows = studentRows.flatMap((student, studentIndex) => subjectRows.map((subject, subjectIndex) => {
  let ca: number;
  let exam: number;
  if (studentIndex < 2) { ca = 20; exam = 30; }
  else if (studentIndex === 2 && subjectIndex === 0) { ca = 40; exam = 60; }
  else if (studentIndex === 3 && subjectIndex === 0) { ca = 0; exam = 0; }
  else { ca = 18 + ((studentIndex + subjectIndex * 3) % 20); exam = 24 + ((studentIndex * 5 + subjectIndex * 7) % 37); }
  const total = ca + exam;
  const grade = total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F";
  return {
    id: uuidAt(9000 + studentIndex * subjectRows.length + subjectIndex),
    studentId: student.id,
    subjectId: subject.id,
    classId: student.classId,
    session: sessionName,
    term: "first" as const,
    caScore: ca.toFixed(2),
    examScore: exam.toFixed(2),
    total: total.toFixed(2),
    grade,
    enteredBy: demoUsers[1 + (subjectIndex % 3)].id,
  };
}));

const attendanceDates = Array.from({ length: 30 }, (_, index) => new Date(Date.UTC(2026, 8, 1 + index)))
  .filter((date) => date.getUTCDay() !== 0 && date.getUTCDay() !== 6)
  .map((date) => date.toISOString().slice(0, 10));
const attendanceRows = studentRows.flatMap((student, studentIndex) => attendanceDates.map((date, dayIndex) => {
  const cycle = (studentIndex + dayIndex) % 29;
  const status = cycle === 3 ? "absent" as const : cycle === 8 ? "late" as const : cycle === 16 ? "excused" as const : "present" as const;
  const classIndex = Math.floor(studentIndex / classSize);
  return {
    id: uuidAt(11000 + studentIndex * attendanceDates.length + dayIndex),
    studentId: student.id,
    attendanceDate: date,
    status,
    markedBy: demoUsers[1 + (classIndex % 3)].id,
  };
}));

const noticeRows = [
  { id: uuidAt(13001), title: "Welcome to the 2026/2027 school year", body: "We look forward to a productive year. Please check the parent portal for term dates and fee information.", audience: "all_parents" as const, classId: null, createdBy: demoUsers[3].id },
  { id: uuidAt(13002), title: "JSS 1A science practical", body: "JSS 1A students should bring their science notebooks on Friday.", audience: "class" as const, classId: classRows[0].id, createdBy: demoUsers[3].id },
  { id: uuidAt(13003), title: "First term assessment week", body: "The first term assessment timetable is available from the school office.", audience: "all_parents" as const, classId: null, createdBy: demoUsers[3].id },
];

const eventRows = [
  { id: uuidAt(13101), title: "First term parent meeting", description: "Parent and teacher meeting in the school hall.", startsAt: new Date("2026-11-21T09:00:00.000Z"), endsAt: new Date("2026-11-21T13:00:00.000Z"), audience: "all_parents" as const, createdBy: demoUsers[3].id },
  { id: uuidAt(13102), title: "End of term", description: "Last scheduled day of the first term.", startsAt: new Date("2026-12-18T08:00:00.000Z"), audience: "all_parents" as const, createdBy: demoUsers[3].id },
];

const applicationRows = [
  { id: uuidAt(13201), referenceNumber: "CHA-APP-2026-0001", childFullName: "Mariam Adewale", dateOfBirth: "2014-05-12", gender: "female", classApplyingFor: "JSS 1", parentFullName: "Sola Adewale", parentPhoneNumber: "+2348000000001", parentEmail: "sola@example.test", status: "submitted" as const },
  { id: uuidAt(13202), referenceNumber: "CHA-APP-2026-0002", childFullName: "David Okoro", dateOfBirth: "2013-10-07", gender: "male", classApplyingFor: "JSS 2", parentFullName: "Ifeanyi Okoro", parentPhoneNumber: "+2348000000002", parentEmail: "ifeanyi@example.test", status: "under_review" as const },
];

const academicTermRows = [
  { session: sessionName, term: "first" as const, startsOn: "2026-09-01", endsOn: "2026-12-19", daysSchoolWasOpen: 70 },
  { session: sessionName, term: "second" as const, startsOn: "2027-01-11", endsOn: "2027-04-02", daysSchoolWasOpen: 62 },
  { session: sessionName, term: "third" as const, startsOn: "2027-04-26", endsOn: "2027-07-16", daysSchoolWasOpen: 59 },
];

function validateTarget() {
  if (process.env.NODE_ENV === "production") throw new Error("Development seed is disabled in production.");
  let neonConfig: { branch?: string };
  try { neonConfig = JSON.parse(readFileSync(".neon", "utf8")) as { branch?: string }; }
  catch { throw new Error("Could not read .neon. Link this workspace to the Neon dev branch before seeding."); }
  if (neonConfig.branch !== "dev") throw new Error("Seed commands only run when this workspace is linked to Neon branch 'dev'.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is missing from .env.local or .env.");
  if (!new URL(url).hostname.endsWith(".neon.tech")) throw new Error("The seed target must be a Neon database on the linked dev branch.");
  if (!demoPassword || demoPassword.length < 12) throw new Error("Set DEMO_PASSWORD in ignored .env.local (at least 12 characters) before seeding.");
}

type SeedTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function wipeSeedData(tx: SeedTransaction) {
  const studentIds = studentRows.map((row) => row.id);
  const classIds = classRows.map((row) => row.id);
  const userIds = demoUsers.map((row) => row.id);
  await tx.delete(schema.notices).where(inArray(schema.notices.id, noticeRows.map((row) => row.id)));
  await tx.delete(schema.events).where(inArray(schema.events.id, eventRows.map((row) => row.id)));
  await tx.delete(schema.applications).where(inArray(schema.applications.id, applicationRows.map((row) => row.id)));
  await tx.delete(schema.scores).where(inArray(schema.scores.studentId, studentIds));
  await tx.delete(schema.attendanceRecords).where(inArray(schema.attendanceRecords.studentId, studentIds));
  await tx.delete(schema.payments).where(inArray(schema.payments.id, paymentRows.map((row) => row.id)));
  await tx.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invoicesRows.map((row) => row.id)));
  await tx.delete(schema.invoices).where(inArray(schema.invoices.id, invoicesRows.map((row) => row.id)));
  await tx.delete(schema.resultsPublished).where(inArray(schema.resultsPublished.classId, classIds));
  await tx.delete(schema.teacherAssignments).where(inArray(schema.teacherAssignments.classId, classIds));
  await tx.delete(schema.parentStudents).where(or(inArray(schema.parentStudents.studentId, studentIds), inArray(schema.parentStudents.parentUserId, userIds)));
  await tx.delete(schema.students).where(inArray(schema.students.id, studentIds));
  await tx.delete(schema.classes).where(inArray(schema.classes.id, classIds));
  await tx.delete(schema.subjects).where(inArray(schema.subjects.id, subjectRows.map((row) => row.id)));
  await tx.delete(schema.account).where(inArray(schema.account.id, demoUsers.map((row) => row.accountId)));
  await tx.delete(schema.user).where(inArray(schema.user.id, userIds));
}

async function seed() {
  validateTarget();
  const passwordHash = await hashPassword(demoPassword!);
  await db.transaction(async (tx) => {
    if (wipe) await wipeSeedData(tx);

    await tx.insert(schema.user).values(demoUsers.map(({ id, name, email, role }) => ({ id, name, email, emailVerified: true, role })))
      .onConflictDoUpdate({ target: schema.user.id, set: { name: sql`excluded.name`, emailVerified: true, role: sql`excluded.role`, updatedAt: new Date() } });
    await tx.insert(schema.account).values(demoUsers.map((demo) => ({ id: demo.accountId, userId: demo.id, accountId: demo.id, providerId: "credential", password: passwordHash })))
      .onConflictDoUpdate({ target: schema.account.id, set: { password: passwordHash, updatedAt: new Date() } });

    await tx.insert(schema.academicSessions).values({ name: sessionName, startsOn: "2026-09-01", endsOn: "2027-07-17" })
      .onConflictDoUpdate({ target: schema.academicSessions.name, set: { startsOn: "2026-09-01", endsOn: "2027-07-17" } });
    await tx.insert(schema.academicTerms).values(academicTermRows)
      .onConflictDoUpdate({ target: [schema.academicTerms.session, schema.academicTerms.term], set: { startsOn: sql`excluded.starts_on`, endsOn: sql`excluded.ends_on`, daysSchoolWasOpen: sql`excluded.days_school_was_open` } });
    await tx.insert(schema.schoolSettings).values({ id: 1, currentSession: sessionName, currentTerm: "first", updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.schoolSettings.id, set: { currentSession: sessionName, currentTerm: "first", updatedAt: new Date() } });

    await tx.insert(schema.classes).values(classRows).onConflictDoUpdate({ target: schema.classes.id, set: { name: sql`excluded.name`, level: sql`excluded.level`, academicYear: sessionName } });
    await tx.insert(schema.subjects).values(subjectRows).onConflictDoUpdate({ target: schema.subjects.id, set: { name: sql`excluded.name` } });
    await tx.insert(schema.students).values(studentRows).onConflictDoUpdate({ target: schema.students.id, set: { firstName: sql`excluded.first_name`, lastName: sql`excluded.last_name`, admissionNumber: sql`excluded.admission_number`, dateOfBirth: sql`excluded.date_of_birth`, classId: sql`excluded.class_id`, status: "active" } });
    await tx.insert(schema.parentStudents).values(parentLinks).onConflictDoUpdate({ target: [schema.parentStudents.parentUserId, schema.parentStudents.studentId], set: { relationship: sql`excluded.relationship` } });
    await tx.insert(schema.teacherAssignments).values(assignments).onConflictDoUpdate({ target: [schema.teacherAssignments.teacherUserId, schema.teacherAssignments.classId, schema.teacherAssignments.subjectId], set: { createdAt: new Date() } });

    await tx.insert(schema.invoices).values(invoicesRows).onConflictDoUpdate({ target: schema.invoices.id, set: { studentId: sql`excluded.student_id`, invoiceNumber: sql`excluded.invoice_number`, status: sql`excluded.status`, issueDate: sql`excluded.issue_date`, dueDate: sql`excluded.due_date`, totalAmount: sql`excluded.total_amount`, title: sql`excluded.title`, session: sessionName, term: "first", notes: sql`excluded.notes` } });
    await tx.insert(schema.invoiceItems).values(itemRows).onConflictDoUpdate({ target: schema.invoiceItems.id, set: { invoiceId: sql`excluded.invoice_id`, description: sql`excluded.description`, quantity: sql`excluded.quantity`, unitAmount: sql`excluded.unit_amount`, amount: sql`excluded.amount`, category: sql`excluded.category` } });
    await tx.insert(schema.payments).values(paymentRows).onConflictDoUpdate({ target: schema.payments.id, set: { invoiceId: sql`excluded.invoice_id`, amount: sql`excluded.amount`, method: sql`excluded.method`, reference: sql`excluded.reference`, receiptNumber: sql`excluded.receipt_number`, balanceAfter: sql`excluded.balance_after`, status: sql`excluded.status`, paidAt: sql`excluded.paid_at` } });
    await tx.insert(schema.scores).values(scoreRows).onConflictDoUpdate({ target: [schema.scores.studentId, schema.scores.subjectId, schema.scores.session, schema.scores.term], set: { classId: sql`excluded.class_id`, caScore: sql`excluded.ca_score`, examScore: sql`excluded.exam_score`, total: sql`excluded.total`, grade: sql`excluded.grade`, enteredBy: sql`excluded.entered_by`, updatedAt: new Date() } });
    await tx.insert(schema.attendanceRecords).values(attendanceRows).onConflictDoUpdate({ target: [schema.attendanceRecords.studentId, schema.attendanceRecords.attendanceDate], set: { status: sql`excluded.status`, markedBy: sql`excluded.marked_by` } });

    await tx.insert(schema.resultsPublished).values(classRows.flatMap((classRow, index) => academicTermRows.map((term) => {
      const published = index === 0 && term.term === "first";
      return { id: uuidAt(12000 + index * 3 + ["first", "second", "third"].indexOf(term.term)), classId: classRow.id, session: sessionName, term: term.term, published, publishedBy: published ? demoUsers[3].id : null, publishedAt: published ? new Date("2026-11-01T09:00:00.000Z") : null };
    }))).onConflictDoUpdate({ target: [schema.resultsPublished.classId, schema.resultsPublished.session, schema.resultsPublished.term], set: { published: sql`excluded.published`, publishedBy: sql`excluded.published_by`, publishedAt: sql`excluded.published_at`, updatedAt: new Date() } });
    await tx.insert(schema.notices).values(noticeRows).onConflictDoUpdate({ target: schema.notices.id, set: { title: sql`excluded.title`, body: sql`excluded.body`, audience: sql`excluded.audience`, classId: sql`excluded.class_id`, createdBy: sql`excluded.created_by` } });
    await tx.insert(schema.events).values(eventRows).onConflictDoUpdate({ target: schema.events.id, set: { title: sql`excluded.title`, description: sql`excluded.description`, startsAt: sql`excluded.starts_at`, endsAt: sql`excluded.ends_at`, audience: sql`excluded.audience`, createdBy: sql`excluded.created_by` } });
    await tx.insert(schema.applications).values(applicationRows).onConflictDoUpdate({ target: schema.applications.id, set: { referenceNumber: sql`excluded.reference_number`, childFullName: sql`excluded.child_full_name`, dateOfBirth: sql`excluded.date_of_birth`, gender: sql`excluded.gender`, classApplyingFor: sql`excluded.class_applying_for`, parentFullName: sql`excluded.parent_full_name`, parentPhoneNumber: sql`excluded.parent_phone_number`, parentEmail: sql`excluded.parent_email`, status: sql`excluded.status`, updatedAt: new Date() } });
  });

  console.info(`Seed ${wipe ? "reset" : "upsert"} complete on the linked Neon dev branch.`);
  console.info(`Created or updated ${demoUsers.length} users, ${classRows.length} classes, ${studentRows.length} students, ${subjectRows.length} subjects, ${scoreRows.length} scores, and ${attendanceRows.length} attendance records.`);
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", getErrorMessage(error));
  process.exitCode = 1;
});
}

void main().catch((error: unknown) => {
  console.error("Seed failed:", getErrorMessage(error));
  process.exitCode = 1;
});
