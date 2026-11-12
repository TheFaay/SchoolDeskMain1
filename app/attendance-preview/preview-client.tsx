"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AttendanceRoster, type AttendanceSaveState } from "@/app/attendance/_components/attendance-roster";
import { ParentAbsenceList } from "@/app/attendance/_components/parent-absence-list";
import { DEMO_CLASSES, DEMO_DATE, DEMO_RECORDS, DEMO_STUDENTS, demoAbsences, type DemoRecord } from "./demo-data";

type View = "teacher" | "parent";

export function AttendancePreviewClient() {
  const [view, setView] = useState<View>("teacher");
  const [classId, setClassId] = useState<string>(DEMO_CLASSES[0].id);
  const [date, setDate] = useState(DEMO_DATE);
  const [records, setRecords] = useState<DemoRecord[]>(DEMO_RECORDS);
  const [savedVersion, setSavedVersion] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const students = useMemo(() => {
    const saved = new Map(records.filter((item) => item.classId === classId && item.date === date).map((item) => [item.studentId, item.status]));
    return (DEMO_STUDENTS[classId] ?? []).map((student) => ({ ...student, status: saved.get(student.studentId) ?? null }));
  }, [classId, date, records]);

  const saveDemo: (state: AttendanceSaveState, formData: FormData) => Promise<AttendanceSaveState> = useCallback(async (_state, formData) => {
    const submittedClass = String(formData.get("classId") ?? "");
    const submittedDate = String(formData.get("date") ?? "");
    if (!DEMO_CLASSES.some((item) => item.id === submittedClass) || !/^\d{4}-\d{2}-\d{2}$/.test(submittedDate)) {
      return { message: "Choose a valid demo class and date.", error: true };
    }
    const roster = DEMO_STUDENTS[submittedClass] ?? [];
    const saved: DemoRecord[] = [];
    for (const student of roster) {
      const status = formData.get(`status:${student.studentId}`);
      if (status === null || status === "") continue;
      if (!["present", "absent", "late", "excused"].includes(String(status))) {
        return { message: "An attendance status was not recognized.", error: true };
      }
      saved.push({ studentId: student.studentId, classId: submittedClass, date: submittedDate, status: String(status) as DemoRecord["status"] });
    }
    setRecords((current) => [
      ...current.filter((record) => record.classId !== submittedClass || record.date !== submittedDate),
      ...saved,
    ]);
    setSavedVersion((current) => current + 1);
    setSaveMessage(`Demo attendance updated for ${saved.length} students.`);
    return { message: `Demo attendance updated for ${saved.length} students.`, error: false };
  }, []);

  const absences = useMemo(() => demoAbsences(records), [records]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-white px-4 pb-16 pt-6 text-slate-900 sm:px-6">
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="note">
        <strong>Demo mode:</strong> These are fictional sample records. Changes stay in this browser tab, are not saved to the database, and reset when you reload.
      </div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#806200]">SchoolDesk · Attendance</p>
        <h1 className="mt-1 text-2xl font-bold text-[#12264F] sm:text-3xl">Attendance preview</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Try marking a class register or review the absences parents can see.</p>
      </header>
      <div className="mb-6 flex gap-2" aria-label="Choose attendance view">
        {(["teacher", "parent"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200] ${view === option ? "bg-[#12264F] text-white" : "border-2 border-[#12264F] text-[#12264F] hover:bg-slate-50"}`}>
            {option === "teacher" ? "Teacher register" : "Parent absences"}
          </button>
        ))}
      </div>
      {view === "teacher" ? (
        <>
          <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)] sm:p-5">
            <div>
              <label htmlFor="demo-class" className="mb-1.5 block text-sm font-semibold text-slate-800">Class</label>
              <select id="demo-class" value={classId} onChange={(event) => setClassId(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]">
                {DEMO_CLASSES.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.level}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="demo-date" className="mb-1.5 block text-sm font-semibold text-slate-800">School date</label>
              <input id="demo-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806200]" />
            </div>
          </div>
          <section aria-label="Demo class attendance roster">
            <h2 className="mb-4 text-lg font-semibold text-[#12264F]">{new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(`${date}T12:00:00+01:00`))}</h2>
            <AttendanceRoster key={`${classId}-${date}-${savedVersion}`} classId={classId} className={DEMO_CLASSES.find((item) => item.id === classId)?.name ?? "Demo class"} date={date} students={students} saveAction={saveDemo} />
            {saveMessage ? <p className="mt-3 text-sm text-slate-600" role="status" aria-live="polite">{saveMessage}</p> : null}
          </section>
        </>
      ) : (
        <section className="space-y-4">
          <div className="rounded-xl bg-[#12264F]/5 p-4 text-sm leading-6 text-[#12264F]">
            <p className="font-semibold">Parent account · Okafor family</p>
            <p>For this preview, the family is linked to Amina Okafor and Chidi Nwosu.</p>
          </div>
          <ParentAbsenceList absences={absences.filter((absence) => ["demo-student-amina", "demo-student-chidi"].includes(absence.studentId))} page={0} pageCount={1} />
        </section>
      )}
      <p className="mt-8 text-sm"><Link href="/" className="font-semibold text-[#12264F] underline underline-offset-4">Back to SchoolDesk home</Link></p>
    </main>
  );
}
