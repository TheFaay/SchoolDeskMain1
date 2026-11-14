import "server-only";

const endpoint = "https://api.paystack.co";

function testSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) throw new Error("Paystack test mode is not configured with a test secret key.");
  return key;
}

export type PaystackTransaction = { reference: string; status: string; amount: number; currency: string; domain: string };

export async function initializePaystackTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl: string }) {
  const response = await fetch(`${endpoint}/transaction/initialize`, {
    method: "POST", signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${testSecret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, amount: String(input.amountKobo), currency: "NGN", reference: input.reference, callback_url: input.callbackUrl, channels: ["card"] }),
  });
  const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: { authorization_url?: string } } | null;
  if (!response.ok || !result?.status || !result.data?.authorization_url) throw new Error(result?.message || "Paystack could not start the test payment.");
  return result.data.authorization_url;
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  const response = await fetch(`${endpoint}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET", cache: "no-store", signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${testSecret()}` },
  });
  const result = await response.json().catch(() => null) as { status?: boolean; data?: PaystackTransaction } | null;
  if (!response.ok || !result?.status || !result.data) throw new Error("Paystack could not verify this transaction. Try again shortly.");
  return result.data;
}

export function isVerifiedTestPayment(transaction: PaystackTransaction, expected: { reference: string; amountKobo: number }) {
  return transaction.status === "success" && transaction.domain === "test" && transaction.currency === "NGN" && transaction.reference === expected.reference && transaction.amount === expected.amountKobo;
}
