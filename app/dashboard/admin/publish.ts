"use server";

// Feature 9: approve (publish) or unpublish results for one class and one
// term. Admin only — every action re-checks the signed-in role on the server.
// Approving also emails the linked parents; in this stage every email goes to
// NOTICE_TEST_TO (never to a real parent), read from .env together with
// RESEND_API_KEY. The two keys are never printed or returned to the browser.

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { emailTemplates } from "@/lib/email/templates";
import {
  getClassResultProgress,
  getClassSession,
  listPublishedResults,
  listClassParentRecipients,
  setResultsPublished,
  unpublishResults,
} from "@/lib/results/repository";
import type { ScoreTerm } from "@/lib/db/schema";

export type PublishActionState = {
  ok: boolean;
  message: string;
};

const TERMS: ScoreTerm[] = ["first", "second", "third"];

function readTerm(value: FormDataEntryValue | null): ScoreTerm | null {
  const text = String(value ?? "");
  return TERMS.includes(text as ScoreTerm) ? (text as ScoreTerm) : null;
}

export async function approveResult(
  _previous: PublishActionState | null,
  formData: FormData,
): Promise<PublishActionState> {
  const fail = {
    ok: false,
    message: "We could not publish the results. Please try again.",
  } as const;

  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "admin") {
      return {
        ok: false,
        message: "Only the school admin can approve results. Please try again.",
      };
    }

    const classId = String(formData.get("classId") ?? "").trim();
    const term = readTerm(formData.get("term"));

    if (!/^[0-9a-f-]{36}$/i.test(classId) || !term) {
      return fail;
    }

    const currentSession = await getClassSession(classId);
    if (!currentSession) {
      return fail;
    }

    const progress = await getClassResultProgress(classId, currentSession, term);
    if (!progress?.calendarConfigured) return { ok: false, message: "Configure the term calendar before publishing results." };
    if (!progress?.complete) {
      return { ok: false, message: `Results are incomplete (${progress?.enteredScores ?? 0} of ${progress?.expectedScores ?? 0} scores entered). Complete the class scores before publishing.` };
    }

    await setResultsPublished(classId, currentSession, term, true, admin.id);
  } catch {
    // Anyunexpected database, auth or email failure still answers the form.
    return fail;
  }

  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Results published. Parent email is a separate step below." };
}

export async function notifyPublishedResults(
  _previous: PublishActionState | null,
  formData: FormData,
): Promise<PublishActionState> {
  void _previous;
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return { ok: false, message: "Only the school admin can notify parents." };
  const id = String(formData.get("id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "Choose a published result." };
  const publication = (await listPublishedResults()).find((row) => row.id === id);
  if (!publication) return { ok: false, message: "This result is no longer published." };

  const recipients = await listClassParentRecipients(publication.classId);
  const grouped = new Map<string, typeof recipients>();
  for (const recipient of recipients) grouped.set(recipient.parentUserId, [...(grouped.get(recipient.parentUserId) ?? []), recipient]);
  let sent = 0;
  let failed = 0;
  const termName = `${publication.term.charAt(0).toUpperCase()}${publication.term.slice(1)} Term`;
  for (const group of grouped.values()) {
    const parent = group[0]!;
    try {
      const children = [...new Set(group.map((recipient) => recipient.childName))];
      await sendEmail({ to: parent.email, ...emailTemplates.resultsPublished(parent.parentName, children.join(", "), `${termName} ${publication.session}`) });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  revalidatePath("/dashboard/admin");
  if (failed) return { ok: false, message: `Results remain published. Sent to ${sent} parent accounts; ${failed} failed. Retry notifications when email delivery is available.` };
  return { ok: true, message: recipients.length ? `Results remain published. Notifications sent to ${sent} parent accounts.` : "Results remain published. No linked parents need notification." };
}

export async function unpublishResult(
  _previous: PublishActionState | null,
  formData: FormData,
): Promise<PublishActionState> {
  const fail = {
    ok: false,
    message: "We could not unpublish the results. Please try again.",
  } as const;

  try {
    const admin = await getCurrentUser();

    if (!admin || admin.role !== "admin") {
      return {
        ok: false,
        message: "Only the school admin can unpublish results. Please try again.",
      };
    }

    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return fail;
    }

    const row = await unpublishResults(id);

    if (!row) {
      return fail;
    }
  } catch {
    return fail;
  }

  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Results unpublished." };
}
