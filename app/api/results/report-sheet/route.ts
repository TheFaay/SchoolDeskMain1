// Feature 4: Download Report Sheet — generates the real PDF file.
// GET /api/results/report-sheet?child=<id>&term=First|Second|Third
//
// TODO(security): with Better Auth, this route must read the session user,
// check the parent role, and 403 anyone who is not that child's parent.
// The sample-parent checks below show the shape of that guard.

import {
  buildReportSheetPdf,
} from "@/app/lib/results/reportSheetPdf";
import {
  canParentView,
  getChildren,
  getClassStanding,
  getCurrentSession,
  getSampleParent,
  getTermResult,
} from "@/app/lib/results/getResults";
import { reportSheetFileName } from "@/app/lib/results/reportSheetFileName";
import { TERM_LABELS, type TermLabel } from "@/app/lib/results/sampleData";

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const childId = first(url.searchParams.get("child") ?? undefined) ?? "";
  const termParam = first(url.searchParams.get("term") ?? undefined) ?? "First";
  const term = (TERM_LABELS as readonly string[]).includes(termParam)
    ? (termParam as TermLabel)
    : "First";

  // Role / ownership guard (sample version).
  const parent = getSampleParent();
  if (!canParentView(parent.id, childId)) {
    return Response.json(
      {
        error:
          "You can only view results for your own child. Choose one of your children on the Results page.",
      },
      { status: 403 },
    );
  }

  const session = getCurrentSession();
  const result = getTermResult(childId, term, session);

  if (!result || !result.published) {
    return Response.json(
      {
        error:
          "Results for this term have not been published yet. We will email you when they are ready.",
      },
      { status: 404 },
    );
  }

  const child = getChildren(parent.id).find((c) => c.id === childId);
  if (!child) {
    return Response.json({ error: "Student not found." }, { status: 404 });
  }

  const bytes = await buildReportSheetPdf({
    studentName: child.name,
    className: child.className,
    admissionNumber: child.admissionNumber,
    term,
    session,
    result,
    standing: getClassStanding(result),
  });

  // File name comes from one shared helper so the on-page anchors use the
  // same name in their `download` attribute.
  const filename = reportSheetFileName(child.name, term);

  return new Response(new Uint8Array(bytes).buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store", // never cache a child's report
    },
  });
}
