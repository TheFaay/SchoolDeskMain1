"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { mutateAdminData, type AdminMutationState } from "./actions";

export const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-[#12264F] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40";
export const labelClass = "block text-sm font-medium text-slate-700";

export default function AdminForm({ children, submit = "Save" }: { children: ReactNode; submit?: string }) {
  const [state, action, pending] = useActionState<AdminMutationState, FormData>(mutateAdminData, null);
  return <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    {children}<button disabled={pending} className="min-h-11 rounded-lg bg-[#12264F] px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Saving…" : submit}</button>
    {state ? <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
  </form>;
}
