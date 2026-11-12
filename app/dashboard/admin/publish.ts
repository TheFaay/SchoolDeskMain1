"use server";

// Feature 9: approve (publish) or unpublish results for one class and one
// term. Admin only — every action re-checks the signed-in role on the server.
// Approving also emails the linked parents; in this stage every email goes to
// NOTICE_TEST_TO (never to a real parent), read from .env together with
// RESEND_API_KEY. The two keys are never printed or returned to the browser.

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import {
  classExists,
  listClassParentRecipients,
  setResultsPublished,
  unpublishResults,
  type ParentRecipient,
} from "@/lib/results/repository";
import type { ScoreTerm } from "@/lib/db/schema";

export type PublishActionState = {
  ok: boolean;
  message: string;
};

const TERMS: ScoreTerm[] = ["first", "second", "third"];

/** Email subject and body use the parent's and child's real names. */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_FROM = "Crown Heights Academy <onboarding@resend.dev>";

function readTerm(value: FormDataEntryValue | null): ScoreTerm | null {
  const text = String(value ?? "");
  return TERMS.includes(text as ScoreTerm) ? (text as ScoreTerm) : null;
}

/** Sends one email per child to the notice inbox. False on any failure. Each
 * request is stopped after 8 seconds so the admin always gets an answer
 * within a few seconds. */
async function notifyParents(
  recipients: ParentRecipient[],
  term: ScoreTerm,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTICE_TEST_TO;

  if (!apiKey || !to) {
    return false;
  }

  const termLabel = `${term.charAt(0).toUpperCase()}${term.slice(1)} Term`;

  // One email per child, sent one at a time to stay inside Resend's rate
  // limits. All emails still go to the single notice inbox.
  for (const recipient of recipients) {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: `${recipient.childName}'s ${termLabel} results are ready`,
        text: `Dear ${recipient.parentName}, the ${termLabel} results for ${recipient.childName} are now available. Log in to view and download the report sheet. Thank you, Crown Heights Academy.`,
      }),
    });

    if (!response.ok) {
      return false;
    }
  }

  return true;
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

    if (!classId || !term) {
      return fail;
    }

    if (!(await classExists(classId))) {
      return fail;
    }

    await setResultsPublished(classId, term, true);

    const recipients = await listClassParentRecipients(classId);
    const notified = await notifyParents(recipients, term);

    if (!notified) {
      return fail;
    }
  } catch {
    // Anyunexpected database, auth or email failure still answers the form.
    return fail;
  }

  revalidatePath("/dashboard/admin");
  return { ok: true, message: "Results published." };
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
