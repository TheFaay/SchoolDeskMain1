import "server-only";

import { db } from "@/lib/db";
import { emailLogs } from "@/lib/db/schema";

export type EmailInput = { to: string; subject: string; text: string };

let deliveryQueue: Promise<void> = Promise.resolve();
let nextSendAt = 0;

function rateLimitedFetch(url: string, init: RequestInit) {
  const request = deliveryQueue.then(async () => {
    const waitMs = Math.max(0, nextSendAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextSendAt = Date.now() + 600;
    return fetch(url, init);
  });
  deliveryQueue = request.then(() => undefined, () => undefined);
  return request;
}

/** Central Resend delivery. Test routing is disabled in production by design. */
export async function sendEmail(input: EmailInput): Promise<void> {
  const testPayments = process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_") ?? false;
  const redirectedTo = process.env.NODE_ENV !== "production" || testPayments ? process.env.NOTICE_TEST_TO?.trim() : "";
  const recipient = redirectedTo || input.to;
  let failure: string | null = null;
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!apiKey || !from) throw new Error("Email delivery is not configured.");
    const response = await rateLimitedFetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: input.subject, text: input.text }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(payload?.message || `Email provider returned HTTP ${response.status}.`);
    }
  } catch (error) {
    failure = error instanceof Error ? error.message.slice(0, 1000) : "Unknown email delivery failure.";
  }
  await db.insert(emailLogs).values({ to: recipient, subject: input.subject.slice(0, 500), status: failure ? "failed" : "sent", error: failure });
  if (failure) throw new Error(failure);
}
