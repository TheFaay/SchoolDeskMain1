import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { applicationDocuments } from "@/lib/db/schema";

const documentTypes = ["birth_certificate", "last_school_report", "passport_photograph", "other"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; type: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") return new Response("Not found", { status: 404 });
  const { id, type } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !documentTypes.includes(type as (typeof documentTypes)[number])) return new Response("Not found", { status: 404 });
  const [document] = await db.select({ fileName: applicationDocuments.fileName, mimeType: applicationDocuments.mimeType, data: applicationDocuments.data })
    .from(applicationDocuments).where(and(eq(applicationDocuments.applicationId, id), eq(applicationDocuments.type, type as (typeof documentTypes)[number]))).limit(1);
  if (!document) return new Response("Not found", { status: 404 });
  const safeName = document.fileName.replace(/[\r\n"\\]/g, "_");
  return new Response(new Uint8Array(document.data), { headers: { "Content-Type": document.mimeType, "Content-Disposition": `attachment; filename="${safeName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
