import {
  getClasses,
  getScores,
  getStudents,
  getSubjects,
  isResultsPublished,
  saveScores,
} from "@/lib/scores/data";
import {
  getCurrentTeacherId,
  TERMS,
  teacherHasAssignment,
  validateScoresRequest,
} from "@/lib/scores/validation";
import type { ScoreRecord, ScoreTerm } from "@/lib/scores/data";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const termValue = url.searchParams.get("term");
    const classes = await getClasses();
    const subjects = await getSubjects();

    if (!classId && !subjectId && !termValue) {
      return Response.json({ classes, subjects, terms: TERMS });
    }
    if (!classId || !subjectId || !termValue || !TERMS.includes(termValue as ScoreTerm)) {
      return Response.json({ error: "Choose a class, subject and term." }, { status: 400 });
    }

    const teacherId = getCurrentTeacherId();
    if (!(await teacherHasAssignment(teacherId, classId, subjectId))) {
      return Response.json({ error: "You are not assigned to this class and subject." }, { status: 403 });
    }
    if (await isResultsPublished(classId, termValue as ScoreTerm)) {
      return Response.json({ error: "Results for this term are published and locked." }, { status: 423 });
    }

    const [students, scores] = await Promise.all([
      getStudents(classId),
      getScores(classId, subjectId, termValue as ScoreTerm),
    ]);
    return Response.json({ students, scores });
  } catch (error) {
    console.error("Unable to load teacher scores", error);
    return Response.json({ error: "Could not load scores. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ errors: { form: "Send a valid scores request." } }, { status: 400 });
  }

  const validation = validateScoresRequest(rawBody);
  if (!validation.ok) {
    return Response.json({ errors: validation.errors }, { status: 400 });
  }

  try {
    const { classId, subjectId, term, rows } = validation.value;
    const teacherId = getCurrentTeacherId();
    if (!(await teacherHasAssignment(teacherId, classId, subjectId))) {
      return Response.json({ error: "You are not assigned to this class and subject." }, { status: 403 });
    }
    if (await isResultsPublished(classId, term)) {
      return Response.json({ error: "Results for this term are published and locked." }, { status: 423 });
    }

    const classStudents = await getStudents(classId);
    const validStudentIds = new Set(classStudents.map((student) => student.id));
    const errors: Record<string, string> = {};
    const seen = new Set<string>();
    for (const row of rows) {
      if (!validStudentIds.has(row.studentId)) {
        errors[row.studentId] = "This student is not in the selected class.";
      } else if (seen.has(row.studentId)) {
        errors[row.studentId] = "This student appears more than once.";
      }
      seen.add(row.studentId);
    }
    if (Object.keys(errors).length) {
      return Response.json({ errors }, { status: 400 });
    }

    const now = new Date().toISOString();
    const records: ScoreRecord[] = rows.map((row) => ({
      ...row,
      classId,
      subjectId,
      term,
      enteredBy: teacherId,
      createdAt: now,
      updatedAt: now,
    }));
    await saveScores(records);
    return Response.json({ saved: records.length });
  } catch (error) {
    console.error("Unable to save teacher scores", error);
    return Response.json({ error: "Could not save scores. Please try again." }, { status: 500 });
  }
}
