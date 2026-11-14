import { failPaystackPayment, reservePaystackPayment, setPaystackAuthorizationUrl } from "@/lib/fees/repository";
import { initializePaystackTransaction } from "@/lib/paystack";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "parent") return Response.json({ error: "Sign in with a parent account to pay an invoice." }, { status: 401 });
  const parent = { id: actor.id, email: actor.email };
  let body: { invoiceId?: unknown };
  try { body = await request.json() as { invoiceId?: unknown }; } catch { return Response.json({ error: "Invalid payment request." }, { status: 400 }); }
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return Response.json({ error: "Choose a valid invoice." }, { status: 400 });

  let paymentReference: string | undefined;
  try {
    const reservation = await reservePaystackPayment({ invoiceId, parentUserId: parent.id, email: parent.email });
    if (reservation.reused) return Response.json({ authorizationUrl: reservation.authorizationUrl });
    paymentReference = reservation.reference;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
    if (!appUrl) throw new Error("The application URL is not configured.");
    const origin = new URL(appUrl);
    const localHttpTest = origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if (process.env.NODE_ENV === "production" && origin.protocol !== "https:" && !localHttpTest) throw new Error("The public payment URL must use HTTPS.");
    const callbackUrl = new URL("/fees/payment/callback", origin).toString();
    const authorizationUrl = await initializePaystackTransaction({ email: reservation.email, amountKobo: reservation.amountKobo, reference: reservation.reference, callbackUrl });
    await setPaystackAuthorizationUrl(reservation.reference, authorizationUrl);
    return Response.json({ authorizationUrl });
  } catch (error) {
    if (paymentReference) {
      try { await failPaystackPayment(paymentReference); } catch { /* Keep the original initialization error for the caller. */ }
    }
    return Response.json({ error: error instanceof Error ? error.message : "Could not start the test payment." }, { status: 400 });
  }
}
