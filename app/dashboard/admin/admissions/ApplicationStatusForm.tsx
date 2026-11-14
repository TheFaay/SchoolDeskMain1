"use client";

import { useActionState } from "react";
import { updateApplicationStatus, type AdmissionActionState } from "./actions";

export default function ApplicationStatusForm({ id, status, notes }: { id: string; status: string; notes: string }) {
  const [state, action, pending] = useActionState<AdmissionActionState, FormData>(updateApplicationStatus, null);
  return <form action={action} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={id} /><label className="grid gap-1 text-xs font-medium text-slate-600">Status<select name="status" defaultValue={status} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"><option value="submitted">Received</option><option value="under_review">Reviewed</option><option value="accepted">Admitted</option><option value="rejected">Rejected</option></select></label><label className="grid min-w-64 flex-1 gap-1 text-xs font-medium text-slate-600">Admissions notes<textarea name="staffNotes" defaultValue={notes} maxLength={4000} rows={2} className="rounded-lg border border-slate-300 p-2 text-sm text-slate-900" /></label><button disabled={pending} className="min-h-11 rounded-lg bg-[#12264F] px-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : "Save review"}</button>{state ? <span role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span> : null}</form>;
}
