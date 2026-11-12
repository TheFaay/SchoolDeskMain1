// Feature 4: Results page (parents).
// Lists one child's subject results for a chosen term, with a Download
// Report Sheet button. Sample data for now — see app/lib/results/.
//
// The page shell is static; the panel below streams once the URL's
// searchParams are ready (required by Next.js Cache Components).

import { Suspense } from "react";
import Link from "next/link";
import {
  TERM_LABELS,
  subjectTotal,
  type TermLabel,
} from "@/app/lib/results/sampleData";
import { gradeForTotal, ordinal } from "@/app/lib/results/scoring";
import {
  canParentView,
  getChildren,
  getClassStanding,
  getCurrentSession,
  getSampleParent,
  getTermResult,
} from "@/app/lib/results/getResults";
import ResultSelectors from "./ResultSelectors";
import { reportSheetFileName } from "@/app/lib/results/reportSheetFileName";

// Colours from the Group 5 style guide: navy blue, white, gold.
const NAVY = "#12264F";
const GOLD = "#C9A227";

const PAGE_TITLE = "Results";

export default function ResultsPage(
  // The promise is passed down unawaited; <Suspense> below unblocks prerender.
  props: PageProps<"/dashboard/academics/results">,
) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: GOLD }}
        >
          Academics
        </p>
        <h1
          className="text-2xl font-bold sm:text-3xl font-[family-name:var(--font-poppins)]"
          style={{ color: NAVY }}
        >
          {PAGE_TITLE}
        </h1>
      </header>

      <Suspense fallback={<ResultsFallback />}>
        <ResultsPanel searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

function ResultsFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading results">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      <p className="text-sm text-slate-500">Loading results…</p>
    </div>
  );
}

async function ResultsPanel({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ---------------------------------------------------------------------
  // TODO(security): when Better Auth lands, read the parent's real id and
  // children from the session here, and check the role (parent) BEFORE
  // any data is fetched or shown. Parents may see only their own children.
  // Until then we use the sample parent below.
  // ---------------------------------------------------------------------
  const parent = getSampleParent();
  const session = getCurrentSession();

  // URL picks child and term; defaults keep the first view working.
  const url = await searchParams;
  const requestedChildId = first(url.child) ?? parent.childrenIds[0];
  const requestedTerm = first(url.term) ?? "First";
  const term = parseTerm(requestedTerm);

  const ownsChild = canParentView(parent.id, requestedChildId);
  const child = getChildren(parent.id).find((c) => c.id === requestedChildId);

  // Selector state is always needed, even on blocked views.
  const terms = TERM_LABELS.map((t) => ({
    value: t,
    label: `${t} Term`,
    published:
      getTermResult(requestedChildId, t, session)?.published ?? false,
  }));

  let heading: string;
  let content: React.ReactNode;

  if (!ownsChild) {
    // Security guard. Shown instead of any data.
    heading = "Results unavailable";
    content = (
      <Notice
        tone="warn"
        title="You can only view results for your own child."
        body="Choose one of your children in the list above. If you think a child is missing, contact the school office."
      />
    );
  } else {
    const result = getTermResult(requestedChildId, term, session);
    const studentName = child?.name ?? "your child";

    if (!result || !result.published) {
      heading = `${studentName} — ${term} Term ${session}`;
      content = (
        <Notice
          tone="info"
          title="Results for this term have not been published yet."
          body="We will email you when they are ready. There is nothing you need to do."
        />
      );
    } else {
      const standing = getClassStanding(result);
      heading = `${studentName} — ${term} Term ${session}`;
      content = (
        <div className="space-y-6">
          <OverviewChips
            childName={studentName}
            className={child?.className ?? ""}
            admissionNumber={child?.admissionNumber ?? ""}
            position={ordinal(standing.position)}
            numberInClass={standing.numberInClass}
            average={standing.average}
            daysPresent={result.attendance.present}
            daysOpened={result.attendance.daysOpened}
          />

          <SubjectsTable subjects={result.subjects} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/dashboard/academics/results/report-sheet?child=${requestedChildId}&term=${term}`}
              prefetch={false}
              className="block rounded-xl border-2 border-[#12264F] px-6 py-4 text-center text-base font-semibold text-[#12264F] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#C9A227] sm:inline-block"
            >
              View Report Sheet
            </Link>
            {/* Straight-to-file download: `download` makes every browser save
                to Downloads (some render application/pdf inline otherwise),
                and the API route sends Content-Disposition: attachment. */}
            <a
              href={`/api/results/report-sheet?child=${requestedChildId}&term=${term}`}
              download={reportSheetFileName(child?.name ?? "", term)}
              type="application/pdf"
              className="block rounded-xl bg-[#12264F] px-6 py-4 text-center text-base font-semibold text-white shadow-sm active:bg-[#0d1b3a] focus-visible:outline-2 focus-visible:outline-[#C9A227] sm:inline-block"
            >
              Download Report Sheet
            </a>
          </div>

          <p className="text-sm text-slate-500">
            Arrangement follows the school&apos;s standard report sheet: CA 30,
            Exam 70, Total 100.
          </p>
        </div>
      );
    }
  }

  return (
    <>
      <section
        aria-label="Choose child and term"
        className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <ResultSelectors
          children={getChildren(parent.id).map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          terms={terms}
          selectedChildId={requestedChildId}
          selectedTerm={term}
        />
      </section>

      <h2
        className="mb-4 text-lg font-semibold font-[family-name:var(--font-poppins)]"
        style={{ color: NAVY }}
      >
        {heading}
      </h2>

      <section aria-label="Results">{content}</section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Small local pieces                                                  */
/* ------------------------------------------------------------------ */

function OverviewChips(props: {
  childName: string;
  className: string;
  admissionNumber: string;
  position: string;
  numberInClass: number;
  average: number;
  daysPresent: number;
  daysOpened: number;
}) {
  const chips = [
    `Position in class: ${props.position} of ${props.numberInClass}`,
    `Average: ${props.average}`,
    `Attendance: ${props.daysPresent} of ${props.daysOpened} days`,
  ];
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm text-slate-600">
        {props.childName} · {props.className} · {props.admissionNumber}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {chips.map((text) => (
          <li
            key={text}
            className="rounded-full bg-[#12264F]/5 px-3 py-1.5 text-sm font-medium text-[#12264F]"
          >
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubjectsTable({
  subjects,
}: {
  subjects: Array<{ subject: string; ca: number; exam: number }>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr style={{ backgroundColor: NAVY }} className="text-white">
            <Th>Subject</Th>
            <Th align="center">CA (30)</Th>
            <Th align="center">Exam (70)</Th>
            <Th align="center">Total (100)</Th>
            <Th align="center">Grade</Th>
            <Th>Remark</Th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => {
            const total = subjectTotal(s);
            const { grade, remark, colour } = gradeForTotal(total);
            return (
              <tr key={s.subject} className="border-t border-slate-200">
                <Td>{s.subject}</Td>
                <Td align="center">{s.ca}</Td>
                <Td align="center">{s.exam}</Td>
                <Td align="center" strong>
                  {total}
                </Td>
                <Td align="center" strong colour={colour}>
                  {grade}
                </Td>
                <Td>{remark}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Notice({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "info" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "rounded-2xl border-2 border-red-200 bg-red-50 p-4"
          : "rounded-2xl border-2 border-blue-200 bg-blue-50 p-4"
      }
    >
      <p
        className={`font-semibold font-[family-name:var(--font-poppins)] ${
          tone === "warn" ? "text-red-800" : "text-blue-900"
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-1 text-sm ${tone === "warn" ? "text-red-700" : "text-blue-800"}`}
      >
        {body}
      </p>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-3 text-sm font-semibold whitespace-nowrap ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  strong,
  colour,
}: {
  children?: React.ReactNode;
  align?: "left" | "center";
  strong?: boolean;
  colour?: string;
}) {
  return (
    <td
      className={`px-3 py-3 text-sm sm:text-base ${strong ? "font-semibold" : ""}`}
      style={colour ? { color: colour } : undefined}
    >
      <div className={align === "center" ? "text-center" : ""}>{children}</div>
    </td>
  );
}

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseTerm(v: string | undefined): TermLabel {
  return (TERM_LABELS as readonly string[]).includes(v ?? "")
    ? (v as TermLabel)
    : "First";
}
