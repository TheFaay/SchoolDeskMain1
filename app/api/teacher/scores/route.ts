import { getCurrentUser } from "@/lib/auth/session";
import { getScoreOptionsForTeacher, getScores, getStudents, isResultsPublished, saveScores } from "@/lib/scores/data";
import { TERMS, validateScoresRequest } from "@/lib/scores/validation";
import type { ScoreTerm } from "@/lib/scores/data";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
    if (user.role !== "teacher" && user.role !== "admin") return Response.json({ error: "Forbidden." }, { status: 403 });
    const isAdmin = user.role === "admin";
    const options = await getScoreOptionsForTeacher(user.id, isAdmin);
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");
    const subjectId = url.searchParams.get("subjectId");
    const termValue = url.searchParams.get("term");
    if (!classId && !subjectId && !termValue) return Response.json({ ...options, terms: TERMS });
    if (!classId || !subjectId || !termValue || !TERMS.includes(termValue as ScoreTerm)) return Response.json({ error: "Choose a class, subject and term." }, { status: 400 });
    if (!isAdmin && !options.assignments.some((assignment) => assignment.classId === classId && assignment.subjectId === subjectId)) return Response.json({ error: "You are not assigned to this class and subject." }, { status: 403 });
    if (!options.assignments.some((assignment) => assignment.classId === classId && assignment.subjectId === subjectId)) return Response.json({ error: "Choose a valid class and subject." }, { status: 400 });
    const locked = await isResultsPublished(classId, termValue as ScoreTerm);
    const [students, scores] = await Promise.all([getStudents(classId), getScores(classId, subjectId, termValue as ScoreTerm)]);
    const savedAt = scores.reduce<string | null>((latest, score) => !latest || score.updatedAt > latest ? score.updatedAt : latest, null);
    return Response.json({ students, scores, locked, savedAt });
  } catch (error) {
    console.error("Unable to load teacher scores", error);
    return Response.json({ error: "Could not load scores. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "teacher" && user.role !== "admin") return Response.json({ error: "Forbidden." }, { status: 403 });
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return Response.json({ errors: { form: "Send a valid scores request." } }, { status: 400 }); }
  const validation = validateScoresRequest(rawBody);
  if (!validation.ok) return Response.json({ errors: validation.errors }, { status: 400 });
  try {
    const { classId, subjectId, term, rows } = validation.value;
    const options = await getScoreOptionsForTeacher(user.id, user.role === "admin");
    if (user.role !== "admin" && !options.assignments.some((assignment) => assignment.classId === classId && assignment.subjectId === subjectId)) return Response.json({ error: "You are not assigned to this class and subject." }, { status: 403 });
    await saveScores({ classId, subjectId, term, actorId: user.id, isAdmin: user.role === "admin", rows });
    return Response.json({ saved: rows.length, savedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message.includes("published and locked")) return Response.json({ error: error.message }, { status: 423 });
    if (error instanceof Error && (error.message.includes("assigned") || error.message.includes("students are not"))) return Response.json({ error: error.message }, { status: 403 });
    console.error("Unable to save teacher scores", error);
    return Response.json({ error: "Could not save scores. Please try again." }, { status: 500 });
  }
}
