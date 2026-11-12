// Feature 4: scoring helpers. Pure functions only — no data, no database.
// Grade bands agreed by the team:
//   A 70-100 | B 60-69 | C 50-59 | D 45-49 | E 40-44 | F below 40

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";

export interface GradeInfo {
  grade: Grade;
  remark: string;
  colour: string; // tailwind-friendly hex, used for text colour on screens
}

/**
 * Grade for a subject total (CA 30 + Exam 70 = 100).
 * Anything over 100 is clamped to A so bad sample data cannot crash the UI.
 */
export function gradeForTotal(total: number): GradeInfo {
  if (total >= 70) return { grade: "A", remark: "Excellent", colour: "#1d5c0f" };
  if (total >= 60) return { grade: "B", remark: "Very Good", colour: "#2d6a2f" };
  if (total >= 50) return { grade: "C", remark: "Good", colour: "#1e5a8a" };
  if (total >= 45) return { grade: "D", remark: "Fair", colour: "#8a6d1e" };
  if (total >= 40) return { grade: "E", remark: "Pass", colour: "#92611f" };
  return { grade: "F", remark: "Fail", colour: "#8f1d1d" };
}

/** All bands, for the grading key shown at the bottom of the report sheet. */
export const GRADING_KEY: Array<{
  grade: Grade;
  band: string; // human-readable range, e.g. "70 - 100"
  remark: string;
}> = [
  { grade: "A", band: "70 - 100", remark: "Excellent" },
  { grade: "B", band: "60 - 69", remark: "Very Good" },
  { grade: "C", band: "50 - 59", remark: "Good" },
  { grade: "D", band: "45 - 49", remark: "Fair" },
  { grade: "E", band: "40 - 44", remark: "Pass" },
  { grade: "F", band: "0 - 39", remark: "Fail" },
];

/** Class position as an ordinal, e.g. 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
