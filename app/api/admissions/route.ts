import { emailTemplates } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { db } from "@/lib/db";
import { applicationDocuments, applications } from "@/lib/db/schema";
import { getAdmissionsFeeKobo, startApplicationPayment } from "@/lib/admissions/payments";
import { koboToDecimal } from "@/lib/admissions/paymentAmount";
import { formatNaira } from "@/lib/fees/format";
import { getCurrentUser } from "@/lib/auth/session";

const maxFileBytes = 2 * 1024 * 1024;
const applicationClasses = new Set(["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]);
const documentFields = ["birthCertificate", "lastSchoolReport", "passportPhotograph"] as const;
const requestTimes = new Map<string, number[]>();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function matchesSignature(type: string, bytes: Uint8Array) {
  if (type === "application/pdf") return bytes.length > 4 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/png") return bytes.length > 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return false;
}

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "applicant") return jsonError("Sign in to your verified applicant account before submitting.", 401);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 7 * 1024 * 1024) return jsonError("The application upload is too large.", 413);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const previous = (requestTimes.get(ip) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (previous.length >= 3) return jsonError("Too many applications from this connection. Please try again later.", 429);
  requestTimes.set(ip, [...previous, now]);

  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError("The application could not be read.", 400); }
  if (String(form.get("website") ?? "").trim()) return jsonError("The application could not be accepted.", 400);
  const childFullName = String(form.get("childFullName") ?? "").trim();
  const dateOfBirth = String(form.get("dateOfBirth") ?? "");
  const gender = String(form.get("gender") ?? "");
  const classApplyingFor = String(form.get("classApplyingFor") ?? "");
  const parentFullName = String(form.get("parentFullName") ?? "").trim();
  const parentPhoneNumber = String(form.get("parentPhoneNumber") ?? "").trim();
  const parentEmail = String(form.get("parentEmail") ?? "").trim().toLowerCase();
  if (parentEmail !== actor.email.toLowerCase()) return jsonError("Use the verified email address on your applicant account.", 403);
  if (childFullName.length < 2 || childFullName.length > 160 || parentFullName.length < 2 || parentFullName.length > 160) return jsonError("Enter valid applicant and parent names.", 400);
  const parsedDob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dateOfBirth || dateOfBirth >= new Date().toISOString().slice(0, 10)) return jsonError("Enter a valid date of birth in the past.", 400);
  if (gender !== "male" && gender !== "female") return jsonError("Choose a valid gender.", 400);
  if (!applicationClasses.has(classApplyingFor)) return jsonError("Choose a valid class.", 400);
  if (!/^\+?[0-9 ()-]{7,24}$/.test(parentPhoneNumber) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail) || parentEmail.length > 254) return jsonError("Enter a valid parent phone number and email address.", 400);

  const feeKobo = getAdmissionsFeeKobo();
  if (!feeKobo) return jsonError("Online applications are temporarily unavailable. Please contact the school office.", 503);

  const documentTypeByField = { birthCertificate: "birth_certificate", lastSchoolReport: "last_school_report", passportPhotograph: "passport_photograph" } as const;
  const documents: { type: "birth_certificate" | "last_school_report" | "passport_photograph"; storageKey: string; fileName: string; mimeType: string; sizeBytes: number; data: Buffer }[] = [];
  for (const field of documentFields) {
    const file = form.get(field);
    if (!(file instanceof File) || file.size === 0) return jsonError("Upload all three required documents.", 400);
    if (file.size > maxFileBytes) return jsonError("Each document must be 2 MB or smaller.", 400);
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name) || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return jsonError("Documents must be PDF, JPG, or PNG files.", 400);
    const data = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(file.type, data)) return jsonError("A document's file contents do not match its file type.", 400);
    documents.push({ type: documentTypeByField[field], storageKey: crypto.randomUUID(), fileName: file.name.slice(0, 255), mimeType: file.type, sizeBytes: file.size, data });
  }

  let referenceNumber = "";
  let created: typeof applications.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    referenceNumber = `CHA-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      created = await db.transaction(async (tx) => {
        const [application] = await tx.insert(applications).values({ referenceNumber, childFullName, dateOfBirth, gender, classApplyingFor, parentFullName, parentPhoneNumber, parentEmail, feeAmount: koboToDecimal(feeKobo) }).returning();
        await tx.insert(applicationDocuments).values(documents.map((document) => ({ applicationId: application!.id, ...document })));
        return application;
      });
    } catch (error) {
      const code = (error as { cause?: { code?: string }; code?: string }).cause?.code ?? (error as { code?: string }).code;
      if (code !== "23505" || attempt === 4) throw error;
    }
  }
  if (!created) return jsonError("The application could not be saved. Please try again.", 500);
  let authorizationUrl: string | undefined;
  let paymentError: string | undefined;
  try {
    const checkout = await startApplicationPayment({ referenceNumber, parentEmail });
    if (!checkout.paid) authorizationUrl = checkout.authorizationUrl;
  } catch (error) {
    paymentError = error instanceof Error ? error.message : "Payment checkout could not be started.";
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  const resumeUrl = appUrl ? new URL("/admissions/payment", appUrl).toString() : "/admissions/payment";
  try { await sendEmail({ to: parentEmail, ...emailTemplates.admissionsReceived(parentFullName, referenceNumber, formatNaira(feeKobo / 100), resumeUrl) }); } catch { /* The application is saved and the email failure is visible to admins. */ }
  return Response.json({ referenceNumber, authorizationUrl, paymentError }, { status: 201 });
}
