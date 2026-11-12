// Feature 4: Results and report sheets — SAMPLE DATA ONLY.
// This file stores fake test data so we can build the UI before the real
// database tables exist. When the database is ready, remove this file and
// let `getResults.ts` query the database instead. No page code changes.

// ---------------------------------------------------------------------------
// Scores: CA 30 + Exam 70 = 100. See scoring.ts for the grade bands.
// ---------------------------------------------------------------------------

export const CA_MAX = 30;
export const EXAM_MAX = 70;
export const TOTAL_MAX = CA_MAX + EXAM_MAX; // 100

export const SCHOOL_NAME = "Crown Heights Academy";

// The current school session. THE single place to change the session for the
// whole feature — the results page, report sheet and sample PDF all read this.
// (Later: comes from the database / school admin settings instead.)
export const CURRENT_SESSION = "2027/2028";

export const TERM_LABELS = ["First", "Second", "Third"] as const;
export type TermLabel = (typeof TERM_LABELS)[number];

export interface Student {
  id: string;
  name: string;
  className: string;
  admissionNumber: string;
}

export interface SubjectScore {
  subject: string;
  /** Continuous Assessment mark, out of CA_MAX (30). */
  ca: number;
  /** Examination mark, out of EXAM_MAX (70). */
  exam: number;
}

export interface Attendance {
  daysOpened: number;
  present: number;
  absent: number;
}

export interface ConductRating {
  trait: string;
  rating: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface TermResult {
  studentId: string;
  term: TermLabel;
  /** School session, e.g. "2027/2028". Usually CURRENT_SESSION. */
  session: string;
  /** False until the school publishes results for this term. */
  published: boolean;
  subjects: SubjectScore[];
  attendance: Attendance;
  classTeacherComment: string;
  principalComment: string;
  /** Date the next term starts, e.g. "Wednesday, 5 January 2028". */
  nextTermBegins: string;
  conduct: ConductRating[];
}

// ---------------------------------------------------------------------------
// Sample students. Nobody here is real.
// ---------------------------------------------------------------------------

export const SAMPLE_PARENT = {
  // Matches the shared seed (lib/db/seed.ts): sample-parent-user-001.
  id: "sample-parent-user-001",
  name: "Mr. & Mrs. Okafor",
  childrenIds: ["stu-001", "stu-002"],
};

export const SAMPLE_STUDENTS: Student[] = [
  {
    id: "stu-001",
    name: "Chidi Okafor",
    className: "JSS 1A",
    admissionNumber: "CHA/2025/001",
  },
  {
    id: "stu-002",
    name: "Ngozi Okafor",
    className: "JSS 2B",
    admissionNumber: "CHA/2024/014",
  },
];

// Sample classmates (fake names) are only here so we can compute
// position in class with sample data. Hidden from the UI otherwise.
export interface Classmate {
  className: string;
  studentName: string;
  studentId: string;
  scores: Array<{ ca: number; exam: number }>;
}

export const SAMPLE_CLASSMATES: Classmate[] = [
  {
    className: "JSS 1A",
    studentName: "Ada Nwosu",
    studentId: "cls-jss1a-01",
    scores: [
      { ca: 26, exam: 62 },
      { ca: 24, exam: 58 },
      { ca: 27, exam: 65 },
      { ca: 22, exam: 54 },
      { ca: 25, exam: 60 },
      { ca: 23, exam: 56 },
      { ca: 26, exam: 63 },
    ],
  },
  {
    className: "JSS 1A",
    studentName: "Tunde Balogun",
    studentId: "cls-jss1a-02",
    scores: [
      { ca: 21, exam: 49 },
      { ca: 19, exam: 45 },
      { ca: 23, exam: 52 },
      { ca: 18, exam: 44 },
      { ca: 20, exam: 47 },
      { ca: 22, exam: 50 },
      { ca: 19, exam: 46 },
    ],
  },
  {
    className: "JSS 1A",
    studentName: "Fatima Aliyu",
    studentId: "cls-jss1a-03",
    scores: [
      { ca: 28, exam: 67 },
      { ca: 27, exam: 66 },
      { ca: 29, exam: 68 },
      { ca: 26, exam: 63 },
      { ca: 28, exam: 66 },
      { ca: 25, exam: 61 },
      { ca: 28, exam: 69 },
    ],
  },
  {
    className: "JSS 2B",
    studentName: "Zainab Musa",
    studentId: "cls-jss2c-01",
    scores: [
      { ca: 25, exam: 60 },
      { ca: 23, exam: 57 },
      { ca: 26, exam: 61 },
      { ca: 24, exam: 58 },
      { ca: 22, exam: 55 },
      { ca: 25, exam: 59 },
    ],
  },
  {
    className: "JSS 2B",
    studentName: "Kelechi Obi",
    studentId: "cls-jss2c-02",
    scores: [
      { ca: 19, exam: 46 },
      { ca: 18, exam: 42 },
      { ca: 21, exam: 48 },
      { ca: 20, exam: 45 },
      { ca: 17, exam: 41 },
      { ca: 19, exam: 44 },
    ],
  },
  {
    className: "JSS 2B",
    studentName: "Blessing Eze",
    studentId: "cls-jss2c-03",
    scores: [
      { ca: 29, exam: 68 },
      { ca: 28, exam: 66 },
      { ca: 30, exam: 69 },
      { ca: 27, exam: 64 },
      { ca: 28, exam: 67 },
      { ca: 29, exam: 66 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sample published results for the current session.
// First Term is published; Second Term is not yet (so the "not published"
// message can be shown). Third Term has no record at all.
// ---------------------------------------------------------------------------

const JSS1A_SERVICES = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Social Studies",
  "Civic Education",
  "Agricultural Science",
  "Computer Studies",
];

const JSS2C_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Social Studies",
  "Business Studies",
  "Fine Art",
];

export const SAMPLE_RESULTS: TermResult[] = [
  {
    studentId: "stu-001",
    term: "First",
    session: CURRENT_SESSION,
    published: true,
    subjects: [
      { subject: "Mathematics", ca: 24, exam: 58 },
      { subject: "English Language", ca: 26, exam: 61 },
      { subject: "Basic Science", ca: 27, exam: 63 },
      { subject: "Social Studies", ca: 25, exam: 57 },
      { subject: "Civic Education", ca: 28, exam: 64 },
      { subject: "Agricultural Science", ca: 23, exam: 52 },
      { subject: "Computer Studies", ca: 27, exam: 66 },
    ],
    attendance: { daysOpened: 68, present: 63, absent: 5 },
    classTeacherComment:
      "Chidi is a hardworking and polite girl. She asks good questions in class. If she practises her maths more, she will do even better.",
    principalComment:
      "A good result. Chidi, keep it up and try to move up next term.",
    nextTermBegins: "Wednesday, 5 January 2028",
    conduct: [
      { trait: "Punctuality", rating: "Excellent" },
      { trait: "Neatness", rating: "Good" },
      { trait: "Politeness", rating: "Excellent" },
      { trait: "Attentiveness", rating: "Excellent" },
      { trait: "Honesty", rating: "Good" },
    ],
  },
  {
    studentId: "stu-002",
    term: "First",
    session: CURRENT_SESSION,
    published: true,
    subjects: [
      { subject: "Mathematics", ca: 21, exam: 47 },
      { subject: "English Language", ca: 23, exam: 51 },
      { subject: "Basic Science", ca: 19, exam: 43 },
      { subject: "Social Studies", ca: 22, exam: 49 },
      { subject: "Business Studies", ca: 24, exam: 53 },
      { subject: "Fine Art", ca: 26, exam: 58 },
    ],
    attendance: { daysOpened: 68, present: 58, absent: 10 },
    classTeacherComment:
      "Ngozi tries, but she loses interest quickly. More study at home and fewer school absences will help her improve.",
    principalComment: "Fair result. Work harder next term, Ngozi.",
    nextTermBegins: "Wednesday, 5 January 2028",
    conduct: [
      { trait: "Punctuality", rating: "Fair" },
      { trait: "Neatness", rating: "Good" },
      { trait: "Politeness", rating: "Good" },
      { trait: "Attentiveness", rating: "Fair" },
      { trait: "Honesty", rating: "Good" },
    ],
  },
  {
    // Not yet published — used to show the "not published" message.
    studentId: "stu-001",
    term: "Second",
    session: CURRENT_SESSION,
    published: false,
    subjects: [],
    attendance: { daysOpened: 0, present: 0, absent: 0 },
    classTeacherComment: "",
    principalComment: "",
    nextTermBegins: "Thursday, 27 April 2028",
    conduct: [],
  },
];

/**
 * Total score for one subject: CA + Exam. Kept here so every page uses
 * the same sum and can never show a different total from the PDF.
 */
export function subjectTotal(score: SubjectScore): number {
  return score.ca + score.exam;
}
