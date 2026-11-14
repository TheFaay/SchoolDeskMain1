"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { applications, db } from "@/lib/db";

export type AdmissionActionState = { ok: boolean; message: string } | null;
type ApplicationStatus = "submitted" | "under_review" | "accepted" | "rejected";
const STATUSES: ApplicationStatus[] = ["submitted", "under_review", "accepted", "rejected"];

export async function updateApplicationStatus(_previous: AdmissionActionState, form: FormData): Promise<AdmissionActionState> {
  void _previous;
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") return { ok: false, message: "Only a school administrator can review applications." };
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as ApplicationStatus;
  const staffNotes = String(form.get("staffNotes") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.includes(status)) return { ok: false, message: "Choose a valid application and status." };
  if (staffNotes.length > 4000) return { ok: false, message: "Notes must be 4,000 characters or fewer." };
  const [updated] = await db.update(applications).set({ status, staffNotes, updatedAt: new Date() }).where(eq(applications.id, id)).returning({ id: applications.id });
  if (!updated) return { ok: false, message: "Application not found." };
  revalidatePath("/dashboard/admin/admissions");
  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Application status updated." };
}
