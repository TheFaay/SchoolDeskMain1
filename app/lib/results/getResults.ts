// Feature 4: the single place where data is fetched.
//
// Today this file reads SAMPLE data (sampleData.ts).
// When the real database tables are ready by the team, replace the bodies of
// the functions below with database queries. No page or PDF code needs to
// change — they only call these functions.
//
// TODO(security): with Better Auth in place, every function here must be given
// the logged-in user's id from the session, and every page/route must check
// the user's role BEFORE calling any of these functions. Parents may see only
// their own children (see canParentView below).

import {
  CURRENT_SESSION,
  SAMPLE_PARENT,
  SAMPLE_RESULTS,
  SAMPLE_STUDENTS,
  SAMPLE_CLASSMATES,
  subjectTotal,
  type Student,
  type TermResult,
  type TermLabel,
} from "./sampleData";

export interface ClassStanding {
  /** How many students sit in the class. */
  numberInClass: number;
  /** 1-based position by grand total; placed students share the first slot. */
  position: number;
  /** Sum of every subject total for this student. */
  grandTotal: number;
  /** grandTotal / number of subjects, one decimal. */
  average: number;
}

/** Sample: the parent whose dashboard we are viewing. */
export function getSampleParent(): typeof SAMPLE_PARENT {
  return SAMPLE_PARENT;
}

/**
 * Children linked to a parent.
 * TODO(security): with auth, look up children by the session user's id.
 */
export function getChildren(parentId: string): Student[] {
  return SAMPLE_STUDENTS.filter((s) => SAMPLE_PARENT.childrenIds.includes(s.id));
}

/** One term result, or null when the school has no record for that term. */
export function getTermResult(
  studentId: string,
  term: TermLabel,
  session: string,
): TermResult | null {
  return (
    SAMPLE_RESULTS.find(
      (r) =>
        r.studentId === studentId && r.term === term && r.session === session,
    ) ?? null
  );
}

/** Does this parent own this student? Used to show the "own child" guard. */
export function canParentView(parentId: string, studentId: string): boolean {
  return (
    parentId === SAMPLE_PARENT.id && SAMPLE_PARENT.childrenIds.includes(studentId)
  );
}

/**
 * Marks a sibling classmate would score on the same subjects, so that
 * position in class means something with sample data. With the database this
 * becomes a real query across the class's published scores.
 */
function classmateTotalsFor(
  className: string,
  baseResult: TermResult,
): number[] {
  const classmates = SAMPLE_CLASSMATES.filter(
    (c) => c.className === className,
  );
  const totals: number[] = [];
  for (const c of classmates) {
    let total = 0;
    baseResult.subjects.forEach((_, i) => {
      const sample = c.scores[i];
      total += sample ? sample.ca + sample.exam : 0;
    });
    totals.push(total);
  }
  return totals;
}

/** Totals, average and position in class for a published result. */
export function getClassStanding(result: TermResult): ClassStanding {
  const own = result.subjects.reduce((sum, s) => sum + subjectTotal(s), 0);
  const others = classmateTotalsFor(SAMPLE_STUDENTS.find((s) => s.id === result.studentId)?.className ?? "", result);

  // Position: own total + everyone we beat (ties share the better position).
  const position = 1 + others.filter((t) => t > own).length;

  const count = result.subjects.length;
  return {
    numberInClass: 1 + others.length,
    position,
    grandTotal: own,
    average: count ? Math.round((own / count) * 10) / 10 : 0,
  };
}

/** Current session shown in the selectors. One place: sampleData.CURRENT_SESSION. */
export function getCurrentSession(): string {
  return CURRENT_SESSION;
}
