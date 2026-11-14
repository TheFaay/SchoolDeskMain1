import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { academicSessions, academicTerms, db, schoolSettings } from "@/lib/db";
import PermissionDenied from "../../PermissionDenied";
import AdminForm, { inputClass, labelClass } from "../manage/AdminForm";

export const metadata: Metadata = { title: "Session and term settings · Crown Heights Academy" };
export const instant = false;

export default function AdminSettingsPage(props: PageProps<"/dashboard/admin/settings">) {
  return <Suspense fallback={<main className="p-8 text-sm text-slate-500">Loading calendar…</main>}><SettingsPanel searchParams={props.searchParams} /></Suspense>;
}

async function SettingsPanel({ searchParams }: { searchParams: PageProps<"/dashboard/admin/settings">["searchParams"] }) {
  const gate = await requireRole("admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-4xl px-5 py-8"><PermissionDenied /></main>;
  const params = await searchParams;
  const [sessions, settings] = await Promise.all([
    db.select({ name: academicSessions.name, startsOn: academicSessions.startsOn, endsOn: academicSessions.endsOn }).from(academicSessions).orderBy(asc(academicSessions.name)),
    db.select({ session: schoolSettings.currentSession, term: schoolSettings.currentTerm }).from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1),
  ]);
  const requested = Array.isArray(params.session) ? params.session[0] : params.session;
  const current = settings[0];
  const session = sessions.some((item) => item.name === requested) ? requested! : current?.session ?? "";
  const terms = await db.select().from(academicTerms).where(eq(academicTerms.session, session));
  const byTerm = new Map(terms.map((item) => [item.term, item]));
  const defaults = (term: string) => byTerm.get(term as "first" | "second" | "third");

  return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-7 sm:px-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">School setup</p><h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Session and term settings</h1><p className="mt-1 text-sm text-slate-600">Set the active session, term dates, and school days open for attendance and reports.</p></div><Link className="text-sm font-semibold text-[#12264F] underline decoration-[#C9A227] underline-offset-4" href="/dashboard/admin/manage">Manage school records</Link></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap gap-2">{sessions.map((item) => <Link key={item.name} href={`/dashboard/admin/settings?session=${encodeURIComponent(item.name)}`} className={`rounded-full border px-3 py-1.5 text-sm ${item.name === session ? "border-[#12264F] bg-[#12264F] text-white" : "border-slate-300 text-slate-700"}`}>{item.name}{item.name === current?.session ? " · current" : ""}</Link>)}</div>
      <AdminForm submit="Save session and calendar"><input type="hidden" name="operation" value="save-calendar" />
        <div className="grid gap-3 sm:grid-cols-3"><label className={labelClass}>Academic session<input className={inputClass} name="session" pattern="\d{4}/\d{4}" required defaultValue={session || "2026/2027"} placeholder="2026/2027" /></label><label className={labelClass}>Session starts<input className={inputClass} name="sessionStart" type="date" required defaultValue={sessions.find((item) => item.name === session)?.startsOn ?? ""} /></label><label className={labelClass}>Session ends<input className={inputClass} name="sessionEnd" type="date" required defaultValue={sessions.find((item) => item.name === session)?.endsOn ?? ""} /></label></div>
        <label className={labelClass}>Current term<select className={inputClass} name="currentTerm" defaultValue={current?.session === session ? current.term : "first"}><option value="first">First term</option><option value="second">Second term</option><option value="third">Third term</option></select></label>
        <div className="grid gap-4 pt-2 md:grid-cols-3">{(["first", "second", "third"] as const).map((term) => { const item = defaults(term); return <fieldset key={term} className="rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold capitalize text-[#12264F]">{term} term</legend><label className={labelClass}>Starts<input className={inputClass} name={`${term}Start`} type="date" required defaultValue={item?.startsOn ?? ""} /></label><label className={`${labelClass} mt-2`}>Ends<input className={inputClass} name={`${term}End`} type="date" required defaultValue={item?.endsOn ?? ""} /></label><label className={`${labelClass} mt-2`}>Days school was open<input className={inputClass} name={`${term}Days`} type="number" min="0" step="1" required defaultValue={item?.daysSchoolWasOpen ?? 0} /></label></fieldset>; })}</div>
      </AdminForm>
    </section>
  </main>;
}
