import { requireRole } from "@/lib/auth/session";

export const instant = false;

export default async function TeacherScoresLayout({ children }: { children: React.ReactNode }) {
  const gate = await requireRole("teacher", "admin");
  if (gate.status === "forbidden") return <main className="p-8">You do not have permission to view this page.</main>;
  return children;
}
