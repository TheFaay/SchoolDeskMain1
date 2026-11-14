import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env.local" });

const baseUrl = (process.env.PORTAL_URL || "http://localhost:3000").replace(/\/+$/, "");
const password = process.env.DEMO_PASSWORD;

if (!password) {
  throw new Error("Set DEMO_PASSWORD in .env.local before running the seeded role smoke check.");
}

const roles = [
  { role: "parent", email: "parent@example.com", routes: ["/dashboard", "/dashboard/attendance", "/dashboard/academics/results", "/fees", "/fees/invoices", "/fees/receipts"] },
  { role: "teacher", email: "teacher@example.com", routes: ["/dashboard/teacher", "/dashboard/teacher/scores", "/dashboard/teacher/attendance"] },
  { role: "bursar", email: "bursar@example.com", routes: ["/dashboard/bursar", "/dashboard/bursar/export?type=debtors&term=first"] },
  { role: "admin", email: "admin@example.com", routes: ["/dashboard/admin", "/dashboard/admin/admissions", "/dashboard/admin/manage", "/dashboard/admin/settings"] },
  { role: "applicant", email: "applicant@example.com", routes: ["/dashboard/applicant"] },
];

const guardedRoutes = [
  { path: "/dashboard", roles: ["parent", "admin"] },
  { path: "/dashboard/attendance", roles: ["parent"] },
  { path: "/dashboard/academics/results", roles: ["parent", "admin"] },
  { path: "/dashboard/academics/results/report-sheet", roles: ["parent", "admin"] },
  { path: "/fees", roles: ["parent", "admin"] },
  { path: "/fees/invoices", roles: ["parent", "admin"] },
  { path: "/fees/invoices/not-a-real-id", roles: ["parent", "admin"] },
  { path: "/fees/invoices/not-a-real-id/print", roles: ["parent", "admin"] },
  { path: "/fees/receipts", roles: ["parent", "admin"] },
  { path: "/fees/receipts/not-a-real-id", roles: ["parent", "admin"] },
  { path: "/fees/payment/callback?reference=invalid", roles: ["parent", "admin"] },
  { path: "/dashboard/teacher", roles: ["teacher", "admin"] },
  { path: "/dashboard/teacher/scores", roles: ["teacher", "admin"] },
  { path: "/dashboard/teacher/attendance", roles: ["teacher", "admin"] },
  { path: "/teacher/scores", roles: ["teacher", "admin"] },
  { path: "/dashboard/bursar", roles: ["bursar", "admin"] },
  { path: "/dashboard/bursar/export", roles: ["bursar", "admin"], api: true },
  { path: "/bursar", roles: ["bursar", "admin"] },
  { path: "/dashboard/admin", roles: ["admin"] },
  { path: "/dashboard/admin/admissions", roles: ["admin"] },
  { path: "/dashboard/admin/manage", roles: ["admin"] },
  { path: "/dashboard/admin/settings", roles: ["admin"] },
  { path: "/dashboard/applicant", roles: ["applicant"] },
  { path: "/api/teacher/scores", roles: ["teacher", "admin"], api: true },
  { path: "/api/results/report-sheet?child=invalid&term=First", roles: ["parent", "admin"], api: true },
];

async function request(path, options = {}) {
  return fetch(new URL(path, `${baseUrl}/`), { redirect: "manual", ...options });
}

const landing = await request("/");
assert.equal(landing.status, 200, "portal home should load");
assert.match(await landing.text(), /Sign in/);

const admissions = await request("/admissions");
assert.equal(admissions.status, 200, "public admissions page should load");
const admissionsHtml = await admissions.text();
assert.match(admissionsHtml, /Application fee/);
assert.match(admissionsHtml, /Pay securely with Paystack/);
assert.match(admissionsHtml, /80,000/);
const register = await request("/admissions/register");
assert.equal(register.status, 200, "new applicants should be able to create an account");
assert.match(await register.text(), /Create an applicant account/i);
const paymentResume = await request("/admissions/payment");
assert.equal(paymentResume.status, 200, "applicants should be able to resume application payment");
assert.match(await paymentResume.text(), /Resume application payment/);
const invalidPaymentResume = await request("/api/admissions/payment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ referenceNumber: "invalid", parentEmail: "not-an-email" }) });
assert.equal(invalidPaymentResume.status, 400, "payment resume should validate input before contacting Paystack");
const unsignedWebhook = await request("/api/paystack/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
assert.equal(unsignedWebhook.status, 401, "webhook must reject unsigned events");

const signedOut = await request("/dashboard");
assert.equal(signedOut.status, 307, "signed-out dashboard request should redirect");
assert.match(signedOut.headers.get("location") || "", /\/login/);

for (const account of roles) {
  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: account.email, password }),
  });
  assert.equal(login.status, 200, `${account.role} demo login should succeed (status ${login.status})`);
  const cookies = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  assert.ok(cookies, `${account.role} login should return a session cookie`);

  for (const path of account.routes) {
    const response = await request(path, { headers: { cookie: cookies } });
    assert.equal(response.status, 200, `${account.role} should load ${path} (status ${response.status})`);
  }

  const applicationForm = new FormData();
  applicationForm.set("parentEmail", "different@example.com");
  const applicationSubmission = await request("/api/admissions", { method: "POST", headers: { cookie: cookies }, body: applicationForm });
  if (account.role === "applicant") {
    assert.equal(applicationSubmission.status, 403, "applicants cannot submit an application under another email address");
  } else {
    assert.equal(applicationSubmission.status, 401, `${account.role} cannot submit a new applicant application`);
  }

  if (account.role === "admin") {
    const setupPage = await request("/dashboard/admin/manage", { headers: { cookie: cookies } });
    const setupHtml = await setupPage.text();
    for (const step of [
      "Set up a new school",
      "Set the academic calendar",
      "Create classes",
      "Create staff and parent accounts",
      "Add subjects",
      "Enroll students",
      "Assign teachers",
      "Link parents to students",
    ]) {
      assert.ok(setupHtml.includes(step), `admin setup guide should include: ${step}`);
    }
  }

  for (const route of guardedRoutes.filter(({ roles: allowedRoles }) => !allowedRoles.includes(account.role))) {
    const forbidden = await request(route.path, { headers: { cookie: cookies } });
    if (route.api) {
      assert.equal(forbidden.status, 403, `${account.role} should be forbidden from ${route.path}`);
    } else {
      assert.equal(forbidden.status, 200, `${account.role} denied page should render at ${route.path}`);
      assert.match(await forbidden.text(), /permission/i, `${account.role} should see an access-denied message at ${route.path}`);
    }
  }
  console.info(`Smoke check passed: ${account.role} (${account.routes.length} own routes and all ${guardedRoutes.length} role boundaries).`);
}

console.info(`Portal smoke check passed at ${baseUrl}.`);
