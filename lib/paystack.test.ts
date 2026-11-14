import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { initializePaystackTransaction, isVerifiedTestPayment, verifyPaystackTransaction } from "./paystack";

const originalKey = process.env.PAYSTACK_SECRET_KEY;
const originalFetch = globalThis.fetch;
const testKey = "sk_test_unit_test_key";

afterEach(() => {
  if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

test("initializes a hosted NGN checkout using the exact server-computed amount and callback", async () => {
  process.env.PAYSTACK_SECRET_KEY = testKey;
  let receivedUrl = "";
  let receivedInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedInit = init;
    return Response.json({ status: true, data: { authorization_url: "https://checkout.paystack.com/unit-test" } });
  }) as typeof fetch;

  const authorizationUrl = await initializePaystackTransaction({
    email: "applicant@example.com",
    amountKobo: 8_000_000,
    reference: "CHA-APP-PAY-test-reference",
    callbackUrl: "http://localhost:3000/admissions/payment/callback",
  });

  assert.equal(authorizationUrl, "https://checkout.paystack.com/unit-test");
  assert.equal(receivedUrl, "https://api.paystack.co/transaction/initialize");
  assert.equal(receivedInit?.method, "POST");
  assert.equal(new Headers(receivedInit?.headers).get("authorization"), `Bearer ${testKey}`);
  assert.deepEqual(JSON.parse(String(receivedInit?.body)), {
    email: "applicant@example.com",
    amount: "8000000",
    currency: "NGN",
    reference: "CHA-APP-PAY-test-reference",
    callback_url: "http://localhost:3000/admissions/payment/callback",
    channels: ["card"],
  });
});

test("rejects live and missing credentials before making a network request", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return Response.json({ status: true, data: { authorization_url: "https://checkout.paystack.com/unit-test" } });
  }) as typeof fetch;
  process.env.PAYSTACK_SECRET_KEY = "sk_live_never-allowed";
  await assert.rejects(() => initializePaystackTransaction({ email: "applicant@example.com", amountKobo: 80000, reference: "r", callbackUrl: "http://localhost" }), /test mode/);
  delete process.env.PAYSTACK_SECRET_KEY;
  await assert.rejects(() => verifyPaystackTransaction("ref"), /test mode/);
  assert.equal(calls, 0);
});

test("verifies against Paystack without caching and requires exact test status, domain, reference, currency, and amount", async () => {
  process.env.PAYSTACK_SECRET_KEY = testKey;
  let receivedUrl = "";
  let receivedInit: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    receivedUrl = String(input);
    receivedInit = init;
    return Response.json({ status: true, data: { reference: "ref/with space", status: "success", amount: 8000000, currency: "NGN", domain: "test" } });
  }) as typeof fetch;

  const transaction = await verifyPaystackTransaction("ref/with space");
  assert.equal(receivedUrl, "https://api.paystack.co/transaction/verify/ref%2Fwith%20space");
  assert.equal(receivedInit?.cache, "no-store");
  assert.equal(isVerifiedTestPayment(transaction, { reference: "ref/with space", amountKobo: 8_000_000 }), true);
  assert.equal(isVerifiedTestPayment({ ...transaction, domain: "live" }, { reference: "ref/with space", amountKobo: 8_000_000 }), false);
  assert.equal(isVerifiedTestPayment({ ...transaction, amount: 1 }, { reference: "ref/with space", amountKobo: 8_000_000 }), false);
  assert.equal(isVerifiedTestPayment({ ...transaction, reference: "another-ref" }, { reference: "ref/with space", amountKobo: 8_000_000 }), false);
  assert.equal(isVerifiedTestPayment({ ...transaction, status: "pending" }, { reference: "ref/with space", amountKobo: 8_000_000 }), false);
});
