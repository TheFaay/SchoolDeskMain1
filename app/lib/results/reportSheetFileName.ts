// Feature 4: one shared helper for the report sheet PDF file name, so the
// anchor's `download` attribute and the API route's Content-Disposition
// always agree. Example: "Chidi-Okafor-First-Term-Report-Sheet.pdf"

import type { TermLabel } from "./sampleData";

export function reportSheetFileName(studentName: string, term: string): string {
  const safe = (s: string) =>
    s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe(studentName)}-${term}-Term-Report-Sheet.pdf`;
}
