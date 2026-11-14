// Feature 4: Download Report Sheet — generates the real PDF file.
// GET /api/results/report-sheet?child=<id>&term=First|Second|Third
//
import { buildReportSheetPdf } from "@/lib/results/reportSheetPdf";
import { getClassStanding, getCurrentSession, getTermAvailability, getTermResult } from "@/lib/results/getResults";
import { reportSheetFileName } from "@/lib/results/reportSheetFileName";
import { TERM_LABELS, type TermLabel } from "@/lib/results/types";
import { getCurrentUser } from "@/lib/auth/session";
import { assertParentOwnsStudent } from "@/lib/auth/ownership";
import { getChildren } from "@/lib/results/getResults";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const childId = first(url.searchParams.get("child") ?? undefined) ?? "";
  const termParam = first(url.searchParams.get("term") ?? undefined) ?? "First";
  if (!(TERM_LABELS as readonly string[]).includes(termParam)) return Response.json({ error: "Choose a valid term." }, { status: 400 });
  const term = termParam as TermLabel;

  const parent = await getCurrentUser();
  if (!parent) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (parent.role !== "parent" && parent.role !== "admin") return Response.json({ error: "Forbidden." }, { status: 403 });
  if (!(await assertParentOwnsStudent(parent.id, childId))) {
    return Response.json(
      {
        error:
          "You can only view results for your own child. Choose one of your children on the Results page.",
      },
      { status: 403 },
    );
  }

  const session = await getCurrentSession();
  if (!session) return Response.json({ error: "The current school session is not configured." }, { status: 503 });
  const availability = await getTermAvailability(childId, term, session);
  const result = availability === "ready" ? await getTermResult(childId, term, session) : null;

  if (availability !== "ready" || !result || !result.published) {
    const error = availability === "no-scores" ? "Scores are not available for this term yet." : availability === "no-calendar" ? "The school calendar is not configured for this term." : "Results for this term have not been published yet.";
    return Response.json({ error }, { status: 404 });
  }

  const child = (await getChildren(parent.id)).find((c) => c.id === childId);
  if (!child) {
    return Response.json({ error: "Student not found." }, { status: 404 });
  }

  const bytes = await buildReportSheetPdf({
    studentName: child.name,
    className: result.className,
    admissionNumber: child.admissionNumber,
    term,
    session,
    result,
    standing: await getClassStanding(result),
  });

  // File name comes from one shared helper so the on-page anchors use the
  // same name in their `download` attribute.
  const filename = reportSheetFileName(child.name, term);

  return new Response(new Uint8Array(bytes).buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store", // never cache a child's report
    },
  });
}
