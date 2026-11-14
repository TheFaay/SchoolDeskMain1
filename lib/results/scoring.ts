// Compatibility exports for report-sheet consumers. Grading rules live in one place.
export { GRADING_KEY, gradeForTotal } from "@/lib/scores/grading";
export type { Grade, GradeInfo } from "@/lib/scores/grading";

/** Class position as an ordinal, e.g. 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
