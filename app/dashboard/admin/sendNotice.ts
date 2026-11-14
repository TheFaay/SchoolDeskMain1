"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { emailTemplates } from "@/lib/email/templates";
import { db } from "@/lib/db";
import { notices, noticeRecipients, parentStudents, students, user } from "@/lib/db/schema";

export type NoticeResult = { ok: boolean; message: string };

export async function sendNotice(_previous: NoticeResult | null, formData: FormData): Promise<NoticeResult> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return { ok: false, message: "Only an administrator can send notices." };
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const audience = String(formData.get("audience") ?? "");
  const classId = String(formData.get("classId") ?? "");
  const parentId = String(formData.get("parentId") ?? "");
  if (!title || title.length > 120 || !message || message.length > 2000) return { ok: false, message: "Enter a title and message within the stated limits." };
  if (!["all_parents", "class", "individual"].includes(audience)) return { ok: false, message: "Choose a notice audience." };
  if (audience === "class" && !/^[0-9a-f-]{36}$/i.test(classId)) return { ok: false, message: "Choose a class." };
  if (audience === "individual" && !parentId) return { ok: false, message: "Choose a parent." };

  let recipients: { id: string; email: string; name: string }[];
  if (audience === "individual") {
    recipients = await db.select({ id: user.id, email: user.email, name: user.name }).from(user).where(and(eq(user.id, parentId), eq(user.role, "parent")));
  } else if (audience === "class") {
    recipients = await db.selectDistinct({ id: user.id, email: user.email, name: user.name }).from(parentStudents).innerJoin(students, eq(students.id, parentStudents.studentId)).innerJoin(user, eq(user.id, parentStudents.parentUserId)).where(and(eq(user.role, "parent"), eq(students.classId, classId)));
  } else {
    recipients = await db.select({ id: user.id, email: user.email, name: user.name }).from(user).where(eq(user.role, "parent"));
  }
  if (!recipients.length) return { ok: false, message: "No parent accounts match that audience." };
  const [notice] = await db.insert(notices).values({ title, body: message, audience: audience as "all_parents" | "class" | "individual", classId: audience === "class" ? classId : null, createdBy: admin.id }).returning({ id: notices.id });
  if (audience === "individual") await db.insert(noticeRecipients).values({ noticeId: notice!.id, userId: recipients[0]!.id });
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      await sendEmail({ to: recipient.email, ...emailTemplates.notice(recipient.name, title, message) });
      sent++;
    } catch { failed++; }
  }
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard");
  return { ok: failed === 0, message: `Notice saved to parent dashboards. Email sent: ${sent}; failed: ${failed}.` };
}
