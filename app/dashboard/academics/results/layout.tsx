import { requireRole } from "@/lib/auth/session";

export const instant = false;

export default async function ResultsLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireRole("parent", "admin");
  if (gate.status === "forbidden") return <main className="p-8">You do not have permission to view results.</main>;
  return children;
}
