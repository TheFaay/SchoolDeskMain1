"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CA_MAX, EXAM_MAX, getGrade } from "@/lib/scores/grading";

type ClassOption = {
  id: string;
  name: string;
  level: string | null;
  academicYear: string;
};
type SubjectOption = { id: string; name: string };
type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
};
type Term = "first" | "second" | "third";
type Entry = { caScore: string; examScore: string };
type Assignment = { classId: string; subjectId: string };

const termLabels: Record<Term, string> = {
  first: "First term",
  second: "Second term",
  third: "Third term",
};

export default function TeacherScoresPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [term, setTerm] = useState<Term>("first");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const availableSubjects = useMemo(() => {
    const allowed = new Set(assignments.filter((item) => !classId || item.classId === classId).map((item) => item.subjectId));
    return subjects.filter((item) => allowed.has(item.id));
  }, [assignments, classId, subjects]);

  useEffect(() => {
    let active = true;
    fetch("/api/teacher/scores")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load classes.");
        if (active) {
          setClasses(data.classes);
          setSubjects(data.subjects);
          setAssignments(data.assignments);
        }
      })
      .catch((error: unknown) => {
        if (active) setFormError(error instanceof Error ? error.message : "Could not load classes.");
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!classId || !subjectId || !term) {
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ classId, subjectId, term });
    fetch(`/api/teacher/scores?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load students.");
        const saved = new Map<string, Entry>(
          data.scores.map((score: { studentId: string; caScore: number; examScore: number }) => [
            score.studentId,
            { caScore: String(score.caScore), examScore: String(score.examScore) },
          ]),
        );
        setStudents(data.students);
        setLocked(Boolean(data.locked));
        setSavedAt(data.savedAt ?? null);
        setEntries(
          Object.fromEntries(
            data.students.map((student: StudentRow) => [
              student.id,
              saved.get(student.id) ?? { caScore: "", examScore: "" },
            ]),
          ),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStudents([]);
        setEntries({});
        setFormError(error instanceof Error ? error.message : "Could not load students.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStudents(false);
      });
    return () => controller.abort();
  }, [classId, subjectId, term]);

  const canSave = Boolean(classId && subjectId && students.length && !loadingStudents && !saving);
  const filledCount = useMemo(
    () => students.filter((student) => {
      const entry = entries[student.id];
      return entry?.caScore !== "" && entry?.examScore !== "";
    }).length,
    [entries, students],
  );

  function updateEntry(studentId: string, key: keyof Entry, value: string) {
    setEntries((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
    setRowErrors((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
    setNotice("");
  }

  function changeSelection(nextClassId: string, nextSubjectId: string, nextTerm: Term) {
    setClassId(nextClassId);
    setSubjectId(nextSubjectId);
    setTerm(nextTerm);
    setStudents([]);
    setEntries({});
    setRowErrors({});
    setFormError("");
    setNotice("");
    setLocked(false);
    setSavedAt(null);
    setLoadingStudents(Boolean(nextClassId && nextSubjectId));
  }

  async function saveScores() {
    setSaving(true);
    setNotice("");
    setFormError("");
    setRowErrors({});
    try {
      const response = await fetch("/api/teacher/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          subjectId,
          term,
          rows: students.map((student) => ({
            studentId: student.id,
            caScore: entries[student.id]?.caScore ?? "",
            examScore: entries[student.id]?.examScore ?? "",
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setRowErrors(data.errors ?? {});
        setFormError(data.error ?? data.errors?.form ?? "Please correct the scores and try again.");
        return;
      }
      setNotice(`Scores saved for ${data.saved} ${data.saved === 1 ? "student" : "students"}.`);
      setSavedAt(data.savedAt);
    } catch {
      setFormError("Could not save scores. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9a7619]">Academics</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#12264F]">Teacher scores</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Enter CA and exam scores for classes and subjects assigned to your account. Blank rows are left untouched.
        </p>
        <Link href="/dashboard/teacher" className="mt-3 inline-flex text-sm font-semibold text-[#12264F] underline">Back to teacher dashboard</Link>
      </header>

      <section aria-label="Score selection" className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:p-5">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Class
          <select
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            value={classId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              const keepSubject = assignments.some((item) => item.classId === nextClassId && item.subjectId === subjectId);
              changeSelection(nextClassId, keepSubject ? subjectId : "", term);
            }}
            disabled={loadingOptions}
          >
            <option value="">Choose a class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}{item.level ? ` · ${item.level}` : ""} · {item.academicYear}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Subject
          <select
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            value={subjectId}
            onChange={(event) => changeSelection(classId, event.target.value, term)}
            disabled={loadingOptions}
          >
            <option value="">Choose a subject</option>
            {availableSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Term
          <select
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-3 text-base font-normal focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            value={term}
            onChange={(event) => changeSelection(classId, subjectId, event.target.value as Term)}
          >
            {Object.entries(termLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </section>

      {formError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {savedAt && <p className="mt-3 text-sm text-slate-500">Last saved {new Date(savedAt).toLocaleString()}.</p>}
      {locked && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Results have been published for this class, session and term. Scores are read-only.</p>}

      <section aria-label="Student scores" className="mt-6">
        {loadingStudents && <p className="py-8 text-center text-slate-600">Loading students…</p>}
        {!loadingOptions && !loadingStudents && classId && subjectId && students.length === 0 && !formError && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">No students found in this class.</p>
        )}
        {!classId || !subjectId ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">Choose a class, subject and term to enter scores.</p>
        ) : null}
        {!loadingStudents && students.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <p>{students.length} {students.length === 1 ? "student" : "students"} · CA out of {CA_MAX} · Exam out of {EXAM_MAX}</p>
              <p>{filledCount} of {students.length} complete</p>
            </div>
            <div className="space-y-3">
              {students.map((student) => {
                const entry = entries[student.id] ?? { caScore: "", examScore: "" };
                const ca = entry.caScore === "" ? null : Number(entry.caScore);
                const exam = entry.examScore === "" ? null : Number(entry.examScore);
                const validTotal = ca !== null && exam !== null && Number.isFinite(ca) && Number.isFinite(exam) && ca >= 0 && ca <= CA_MAX && exam >= 0 && exam <= EXAM_MAX;
                const total = validTotal ? ca + exam : null;
                return (
                  <article key={student.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-1">
                      <div>
                        <h2 className="font-semibold text-slate-900">{student.firstName} {student.lastName}</h2>
                        <p className="text-sm text-slate-500">{student.admissionNumber}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        {total === null ? "Total —" : `Total ${total} · Grade ${getGrade(total)}`}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                        CA <span className="text-xs font-normal text-slate-500">Max {CA_MAX}</span>
                        <input
                          aria-label={`CA score for ${student.firstName} ${student.lastName}`}
                          type="number" inputMode="decimal" step="0.01" min="0" max={CA_MAX} disabled={locked}
                          className="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                          value={entry.caScore}
                          onChange={(event) => updateEntry(student.id, "caScore", event.target.value)}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                        Exam <span className="text-xs font-normal text-slate-500">Max {EXAM_MAX}</span>
                        <input
                          aria-label={`Exam score for ${student.firstName} ${student.lastName}`}
                          type="number" inputMode="decimal" step="0.01" min="0" max={EXAM_MAX} disabled={locked}
                          className="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                          value={entry.examScore}
                          onChange={(event) => updateEntry(student.id, "examScore", event.target.value)}
                        />
                      </label>
                    </div>
                    {rowErrors[student.id] && <p role="alert" className="mt-3 text-sm text-red-700">{rowErrors[student.id]}</p>}
                  </article>
                );
              })}
            </div>
            {rowErrors.form && <p role="alert" className="mt-4 text-sm text-red-700">{rowErrors.form}</p>}
            <button
              type="button"
              onClick={saveScores}
              disabled={!canSave || locked}
              className="mt-5 min-h-12 w-full rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Saving scores…" : "Save scores"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
