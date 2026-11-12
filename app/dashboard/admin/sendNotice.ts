"use server";

// Portal notices: the admin's one and only email action, sent with Resend's
// REST API via plain fetch. RESEND_API_KEY and NOTICE_TEST_TO live only in
// .env and are never printed or returned to the browser.

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export type NoticeResult = {
  ok: boolean;
  message: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendNotice(
  _previous: NoticeResult | null,
  formData: FormData,
): Promise<NoticeResult> {
  const admin = await getCurrentUser();

  if (!admin) {
    return { ok: false, message: "You are signed out. Please sign in again." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!title || !message) {
    return { ok: false, message: "Please fill in both a title and a message." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTICE_TEST_TO;

  if (!apiKey || !to) {
    return {
      ok: false,
      message: "We could not send the notice. Please try again.",
    };
  }

  // The parent's real name comes from the parent account on record.
  const parents = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.role, "parent"))
    .limit(1);
  const parentName = parents[0]?.name;

  if (!parentName) {
    return {
      ok: false,
      message: "We could not send the notice. Please try again.",
    };
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Crown Heights Academy <onboarding@resend.dev>",
      to: [to],
      subject: title,
      text: [
        `Dear ${parentName},`,
        "",
        message,
        "",
        "Thank you.",
        "Crown Heights Academy",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      message: "We could not send the notice. Please try again.",
    };
  }

  return { ok: true, message: "Notice sent." };
}
