"use client";

import { useEffect, useState } from "react";

import type {
  Child,
  Notice,
  ParentDashboardData,
  Result,
  SchoolInfo,
} from "./types";

const LOAD_DELAY_MS = 600;

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

const gradeStyles: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  B: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  C: "bg-amber-50 text-amber-800 ring-amber-600/20",
  D: "bg-orange-50 text-orange-800 ring-orange-600/20",
  E: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const noticeCategoryStyles: Record<string, string> = {
  Academic: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  Event: "bg-amber-50 text-amber-800 ring-amber-600/10",
  Finance: "bg-emerald-50 text-emerald-800 ring-emerald-600/10",
};

type SectionState = "loading" | "empty" | "error" | "ready";
type PreviewMode = "live" | "loading" | "empty" | "error";

function formatNaira(amount: number) {
  return nairaFormatter.format(amount);
}

function formatDate(isoDate: string) {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

function getDateParts(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);

  return {
    day: date.getUTCDate().toString().padStart(2, "0"),
    month: monthFormatter.format(date).toUpperCase(),
  };
}

function getInitials(person: { firstName: string; lastName: string }) {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

export function ParentDashboardPage({
  data,
}: {
  data: ParentDashboardData;
}) {
  const { parent, school, children, notices } = data;
  const firstChild = children[0];
  const [selectedChildId, setSelectedChildId] = useState(firstChild?.id ?? "");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("live");
  const [isLoading, setIsLoading] = useState(true);
  const selectedChild =
    children.find((child) => child.id === selectedChildId) ?? firstChild;

  useEffect(() => {
    if (previewMode !== "live" || !isLoading) {
      return;
    }

    const timer = window.setTimeout(() => setIsLoading(false), LOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isLoading, previewMode]);

  const sectionState: SectionState =
    previewMode === "loading"
      ? "loading"
      : previewMode === "empty"
        ? "empty"
        : previewMode === "error"
          ? "error"
          : isLoading
            ? "loading"
            : "ready";

  const resultsAverage =
    selectedChild && selectedChild.results.length > 0
      ? Math.round(
          selectedChild.results.reduce(
            (total, result) => total + (result.score / result.maxScore) * 100,
            0,
          ) / selectedChild.results.length,
        )
      : null;

  function selectChild(childId: string) {
    if (childId === selectedChildId) {
      return;
    }

    setSelectedChildId(childId);
    setIsLoading(true);
  }

  function changePreviewMode(mode: PreviewMode) {
    setPreviewMode(mode);
    if (mode === "live") {
      setIsLoading(true);
    }
  }

  function retry() {
    setPreviewMode("live");
    setIsLoading(true);
  }

  if (!selectedChild) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 px-4 text-slate-900">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold">
            No children linked to this account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Please contact the school office so we can link your children to
            your parent account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to dashboard
      </a>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-sm font-bold tracking-wide text-white ring-1 ring-inset ring-white/20">
                {school.shortName}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {school.name}
                </p>
                <p className="text-xs text-indigo-200">Parent portal</p>
              </div>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-full bg-white/10 px-3 text-xs font-medium text-indigo-100 ring-1 ring-inset ring-white/15">
              {school.currentTerm}
            </span>
          </div>
          <div className="relative mt-8 flex items-end justify-between gap-5 sm:mt-10">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Welcome back
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {parent.firstName} {parent.lastName}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
                Here is the latest on your children&apos;s results, fees and
                school notices.
              </p>
            </div>
            <div
              aria-hidden="true"
              className="hidden h-20 w-20 shrink-0 place-items-center rounded-full bg-white/10 text-2xl font-semibold text-white ring-1 ring-inset ring-white/20 sm:grid"
            >
              {getInitials(parent)}
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-medium text-indigo-100 ring-1 ring-inset ring-white/15">
              <UsersIcon className="h-3.5 w-3.5" />
              {children.length} children
            </span>
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-xs font-medium text-indigo-100 ring-1 ring-inset ring-white/15">
              <BellIcon className="h-3.5 w-3.5" />
              {notices.length} new notices
            </span>
            <span className="inline-flex min-h-8 items-center rounded-full bg-white/10 px-3 text-xs font-medium text-indigo-100 ring-1 ring-inset ring-white/15">
              {parent.relationship}
            </span>
          </div>
        </header>
        <ChildSelector
          childList={children}
          selectedChildId={selectedChild.id}
          onSelect={selectChild}
        />
        <main id="dashboard-main" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-5">
            <ResultsSection
              child={selectedChild}
              state={sectionState}
              average={resultsAverage}
              onRetry={retry}
            />
            <FeesSection
              child={selectedChild}
              state={sectionState}
              onRetry={retry}
            />
          </div>
          <NoticesSection
            notices={notices}
            school={school}
            state={sectionState}
            onRetry={retry}
          />
        </main>
        <StatePreview mode={previewMode} onChange={changePreviewMode} />
        <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 {school.name}. All rights reserved.
          </p>
          <p>Parent dashboard · Results and notices shown are sample data.</p>
        </footer>
      </div>
    </div>
  );
}

function ChildSelector({
  childList,
  selectedChildId,
  onSelect,
}: {
  childList: Child[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
}) {
  return (
    <section
      aria-labelledby="child-selector-heading"
      className="relative z-10 -mt-4 mx-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:mx-6 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-indigo-600" />
          <h2
            id="child-selector-heading"
            className="text-sm font-semibold text-slate-900"
          >
            Select a child
          </h2>
        </div>
        <p className="text-xs font-medium text-slate-500">
          {childList.length} children enrolled
        </p>
      </div>
      <div
        role="group"
        aria-label="Choose which child to view"
        className="mt-3 grid gap-3 sm:grid-cols-2"
      >
        {childList.map((child) => {
          const isActive = child.id === selectedChildId;

          return (
            <button
              key={child.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(child.id)}
              className={`group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${
                isActive
                  ? "border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600"
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {getInitials(child)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {child.firstName} {child.lastName}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-600">
                  {child.className} · {child.admissionNumber}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 text-transparent"
                }`}
              >
                <CheckIcon className="h-4 w-4" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ResultsSection({
  child,
  state,
  average,
  onRetry,
}: {
  child: Child;
  state: SectionState;
  average: number | null;
  onRetry: () => void;
}) {
  const hasResults = child.results.length > 0;

  return (
    <SectionCard
      id="recent-results-heading"
      title="Recent results"
      subtitle={`${child.firstName} · ${child.currentTerm}`}
      icon={<ChartIcon className="h-5 w-5" />}
      meta={
        state === "ready" && average !== null ? (
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
            Average
            <span className="text-sm tabular-nums">{average}%</span>
          </span>
        ) : null
      }
      className="lg:col-span-3"
    >
      {state === "loading" ? <ResultsSkeleton /> : null}
      {state === "error" ? (
        <ErrorState
          title="We couldn't load the results"
          description="The results service did not respond. Please try again in a moment."
          onRetry={onRetry}
        />
      ) : null}
      {state === "empty" || (state === "ready" && !hasResults) ? (
        <EmptyState
          icon={<ChartIcon className="h-5 w-5" />}
          title="No results published yet"
          description={`${child.firstName}'s results will appear here as soon as the school publishes them.`}
        />
      ) : null}
      {state === "ready" && hasResults ? (
        <ul className="divide-y divide-slate-100">
          {child.results.map((result) => (
            <ResultRow key={result.id} result={result} />
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}

function ResultRow({ result }: { result: Result }) {
  const percentage = Math.round((result.score / result.maxScore) * 100);
  const barColor =
    percentage >= 80
      ? "bg-emerald-500"
      : percentage >= 70
        ? "bg-indigo-500"
        : "bg-amber-500";

  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {result.subject}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{result.teacher}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {result.score}
            <span className="text-xs font-normal text-slate-500">
              /{result.maxScore}
            </span>
          </p>
          <span
            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ring-1 ring-inset ${
              gradeStyles[result.grade] ??
              "bg-slate-100 text-slate-700 ring-slate-600/10"
            }`}
          >
            {result.grade}
          </span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${result.subject} score`}
        aria-valuemin={0}
        aria-valuemax={result.maxScore}
        aria-valuenow={result.score}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </li>
  );
}

function FeesSection({
  child,
  state,
  onRetry,
}: {
  child: Child;
  state: SectionState;
  onRetry: () => void;
}) {
  return (
    <SectionCard
      id="fees-summary-heading"
      title="Fees summary"
      subtitle={`${child.firstName} · ${child.currentTerm}`}
      icon={<WalletIcon className="h-5 w-5" />}
      className="lg:col-span-2"
    >
      {state === "loading" ? <FeesSkeleton /> : null}
      {state === "error" ? (
        <ErrorState
          title="We couldn't load the fees"
          description="The billing service did not respond. Please try again in a moment."
          onRetry={onRetry}
        />
      ) : null}
      {state === "empty" || (state === "ready" && !child.fees) ? (
        <EmptyState
          icon={<WalletIcon className="h-5 w-5" />}
          title="No fee record found"
          description={`There is no fee record for ${child.firstName} this term. Contact the bursary if this looks wrong.`}
        />
      ) : null}
      {state === "ready" && child.fees ? (
        <FeesContent fees={child.fees} childName={child.firstName} />
      ) : null}
    </SectionCard>
  );
}

function FeesContent({
  fees,
  childName,
}: {
  fees: NonNullable<Child["fees"]>;
  childName: string;
}) {
  const owed = Math.max(fees.totalBilled - fees.amountPaid, 0);
  const isPaid = owed === 0;
  const paidPercent =
    fees.totalBilled > 0
      ? Math.min(100, Math.round((fees.amountPaid / fees.totalBilled) * 100))
      : 0;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        className={`relative overflow-hidden rounded-2xl p-5 text-white ${
          isPaid
            ? "bg-gradient-to-br from-emerald-700 to-teal-800"
            : "bg-gradient-to-br from-slate-900 to-indigo-900"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">
              Outstanding balance
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatNaira(owed)}
            </p>
          </div>
          <span
            className={`inline-flex min-h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold ${
              isPaid
                ? "bg-emerald-300 text-emerald-950"
                : "bg-white/15 text-white ring-1 ring-inset ring-white/25"
            }`}
          >
            {isPaid ? "Paid in full" : "Part paid"}
          </span>
        </div>
        <div className="relative mt-5">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-white/80">
            <span>{paidPercent}% paid</span>
            <span>Due {formatDate(fees.dueDate)}</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Fees paid for ${childName}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={paidPercent}
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"
          >
            <div
              className={`h-full rounded-full ${
                isPaid ? "bg-emerald-300" : "bg-indigo-300"
              }`}
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <dt className="text-slate-600">Total billed</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatNaira(fees.totalBilled)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <dt className="text-slate-600">Amount paid</dt>
          <dd className="font-semibold tabular-nums text-emerald-700">
            {formatNaira(fees.amountPaid)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">Due date</dt>
          <dd className="font-semibold text-slate-900">
            {formatDate(fees.dueDate)}
          </dd>
        </div>
      </dl>
      {fees.lastPaymentDate ? (
        <p className="text-xs text-slate-600">
          Last payment received {formatDate(fees.lastPaymentDate)}.
        </p>
      ) : null}
      <p
        className={`mt-auto rounded-xl px-4 py-3 text-xs leading-5 ${
          isPaid
            ? "bg-emerald-50 text-emerald-900"
            : "bg-amber-50 text-amber-900"
        }`}
      >
        {isPaid
          ? `${childName}'s fees are fully paid for this term. Thank you.`
          : `${formatNaira(owed)} is still outstanding. Pay before ${formatDate(fees.dueDate)} to avoid late fees.`}
      </p>
    </div>
  );
}

function NoticesSection({
  notices,
  school,
  state,
  onRetry,
}: {
  notices: Notice[];
  school: SchoolInfo;
  state: SectionState;
  onRetry: () => void;
}) {
  const hasNotices = notices.length > 0;

  return (
    <SectionCard
      id="latest-notices-heading"
      title="Latest notices"
      subtitle={`${school.name} · Whole-school announcements`}
      icon={<BellIcon className="h-5 w-5" />}
      meta={
        state === "ready" && hasNotices ? (
          <span className="inline-flex min-h-9 items-center rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/10">
            {notices.length} new
          </span>
        ) : null
      }
      className="mt-5"
    >
      {state === "loading" ? <NoticesSkeleton /> : null}
      {state === "error" ? (
        <ErrorState
          title="We couldn't load the notices"
          description="The notices service did not respond. Please try again in a moment."
          onRetry={onRetry}
        />
      ) : null}
      {state === "empty" || (state === "ready" && !hasNotices) ? (
        <EmptyState
          icon={<BellIcon className="h-5 w-5" />}
          title="You're all caught up"
          description="There are no new notices from the school right now. Check back later."
        />
      ) : null}
      {state === "ready" && hasNotices ? (
        <ul className="grid gap-3 md:grid-cols-3">
          {notices.map((notice) => {
            const date = getDateParts(notice.publishedAt);

            return (
              <li key={notice.id}>
                <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white ring-1 ring-inset ring-slate-200"
                    >
                      <span className="text-sm font-bold leading-none text-slate-900">
                        {date.day}
                      </span>
                      <span className="mt-0.5 text-[10px] font-semibold leading-none text-slate-500">
                        {date.month}
                      </span>
                    </span>
                    <span
                      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset ${
                        noticeCategoryStyles[notice.category]
                      }`}
                    >
                      {notice.category}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-5 text-slate-900">
                    {notice.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-slate-600">
                    {notice.body}
                  </p>
                  <p className="mt-3 border-t border-slate-200/70 pt-3 text-xs text-slate-500">
                    Posted {formatDate(notice.publishedAt)}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

function SectionCard({
  id,
  title,
  subtitle,
  icon,
  meta,
  className = "",
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 id={id} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              {subtitle}
            </p>
          </div>
        </div>
        {meta ? <div className="shrink-0">{meta}</div> : null}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading recent results…</span>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} aria-hidden="true" className="animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3.5 w-32 rounded bg-slate-200" />
              <div className="h-2.5 w-20 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function FeesSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col gap-4">
      <span className="sr-only">Loading fees summary…</span>
      <div aria-hidden="true" className="animate-pulse space-y-4">
        <div className="h-40 rounded-2xl bg-slate-200" />
        <div className="space-y-3">
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
        </div>
        <div className="h-12 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

function NoticesSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading latest notices…</span>
      <div aria-hidden="true" className="grid animate-pulse gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-48 rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-100"
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-1 flex-col items-start justify-center rounded-2xl border border-rose-200 bg-rose-50 p-5"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-100 text-rose-700">
        <AlertIcon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-rose-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-rose-800">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
      >
        <RefreshIcon className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

function StatePreview({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}) {
  const options: { value: PreviewMode; label: string }[] = [
    { value: "live", label: "Live" },
    { value: "loading", label: "Loading" },
    { value: "empty", label: "Empty" },
    { value: "error", label: "Error" },
  ];

  return (
    <details className="group mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <SlidersIcon className="h-4 w-4" />
        </span>
        Preview loading, empty and error states
        <ChevronDownIcon className="ml-auto h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <div
          role="group"
          aria-label="Preview dashboard data state"
          className="flex flex-wrap gap-2"
        >
          {options.map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(option.value)}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Demo controls for this sample dashboard. Sections also show their own
          skeleton while switching between children.
        </p>
      </div>
    </details>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M21 19v-1.5a4 4 0 0 0-3-3.87M16.5 3.63a3.5 3.5 0 0 1 0 6.74" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" strokeWidth="2.2" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 17.5v-9Z" />
      <path d="M4 9h13" />
      <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 3.5 21 19H3L12 3.5Z" />
      <path d="M12 9v4M12 16.5v.01" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
