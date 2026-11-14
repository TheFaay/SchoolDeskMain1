import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { applicationDocuments, applications, db } from "@/lib/db";
import { formatNaira } from "@/lib/fees/format";
import PermissionDenied from "../../PermissionDenied";
import ApplicationStatusForm from "./ApplicationStatusForm";

export const metadata: Metadata = { title: "Admissions review · Crown Heights Academy" };
export const instant = false;

export default async function AdmissionsReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const gate = await requireRole("admin");
  if (gate.status === "forbidden") return <main className="mx-auto max-w-5xl px-5 py-8"><PermissionDenied /></main>;
  const [{ status = "all" }, allRows, documents] = await Promise.all([searchParams, db.select().from(applications).orderBy(asc(applications.status), desc(applications.createdAt)), db.select({ applicationId: applicationDocuments.applicationId, type: applicationDocuments.type }).from(applicationDocuments)]);
  const rows = status === "all" ? allRows : allRows.filter((item) => item.status === status);
  const allowedStatuses = ["all", "submitted", "under_review", "accepted", "rejected"];
  const selectedStatus = allowedStatuses.includes(status) ? status : "all";
  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-7 sm:px-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#806200]">School admin</p><h1 className="mt-1 font-[family-name:var(--font-poppins)] text-2xl font-bold text-[#12264F]">Admissions review</h1><p className="mt-1 text-sm text-slate-600">Review submitted applications and update their status.</p></div><Link href="/dashboard/admin/manage" className="text-sm font-semibold text-[#12264F] underline decoration-[#C9A227] underline-offset-4">Manage school records</Link></header>
    <nav aria-label="Filter applications" className="flex flex-wrap gap-2">{allowedStatuses.map((value) => <Link key={value} href={value === "all" ? "/dashboard/admin/admissions" : `?status=${value}`} aria-current={selectedStatus === value ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${selectedStatus === value ? "border-[#12264F] bg-[#12264F] text-white" : "border-slate-300 text-slate-700"}`}>{value === "all" ? "All" : value.replaceAll("_", " ")}</Link>)}</nav>
    {rows.length ? <div className="space-y-3">{rows.map((item) => { const itemDocuments = documents.filter((doc) => doc.applicationId === item.id); return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.referenceNumber} · {item.status.replaceAll("_", " ")}</p><h2 className="mt-1 font-[family-name:var(--font-poppins)] text-lg font-semibold text-[#12264F]">{item.childFullName}</h2><p className="mt-1 text-sm text-slate-600">Applying for {item.classApplyingFor} · Date of birth {item.dateOfBirth}</p><p className="mt-1 text-sm font-medium text-[#12264F]">Application fee: {item.feeAmount ? formatNaira(Number(item.feeAmount)) : "Not set"} · <span className="capitalize">{item.feeStatus}</span>{item.feePaidAt ? ` · paid ${new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(item.feePaidAt)}` : ""}</p></div><time className="text-xs text-slate-500">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(item.createdAt)}</time></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Parent / guardian</dt><dd>{item.parentFullName}</dd></div><div><dt className="text-xs text-slate-500">Email</dt><dd><a className="text-[#12264F] underline" href={`mailto:${item.parentEmail}`}>{item.parentEmail}</a></dd></div><div><dt className="text-xs text-slate-500">Phone</dt><dd><a className="text-[#12264F] underline" href={`tel:${item.parentPhoneNumber}`}>{item.parentPhoneNumber}</a></dd></div></dl><div className="mt-4 flex flex-wrap gap-3 text-sm">{itemDocuments.map((doc) => <a key={doc.type} className="font-medium text-[#12264F] underline" href={`/api/admin/admissions/${item.id}/documents/${doc.type}`}>{doc.type.replaceAll("_", " ")}</a>)}</div><div className="mt-4"><ApplicationStatusForm id={item.id} status={item.status} notes={item.staffNotes} /></div></article>; })}</div> : <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No applications match this filter.</p>}
  </main>;
}
