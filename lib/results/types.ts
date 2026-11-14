export { CA_MAX, EXAM_MAX, TOTAL_MAX } from "@/lib/scores/grading";
export const SCHOOL_NAME = "Crown Heights Academy";
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
  ca: number;
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
  classId: string;
  className: string;
  term: TermLabel;
  session: string;
  published: boolean;
  subjects: SubjectScore[];
  attendance: Attendance;
  nextTermBegins: string;
  conduct: ConductRating[];
}

export function subjectTotal(score: SubjectScore): number {
  return score.ca + score.exam;
}
