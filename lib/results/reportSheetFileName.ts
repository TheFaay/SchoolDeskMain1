// Feature 4: one shared helper for the report sheet PDF file name, so the
// anchor's `download` attribute and the API route's Content-Disposition
// always agree. Example: "Chidi-Okafor-First-Term-Report-Sheet.pdf"

export function reportSheetFileName(studentName: string, term: string): string {
  const safe = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${safe(studentName) || "Student"}-${safe(term) || "Term"}-Term-Report-Sheet.pdf`;
}
