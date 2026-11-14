import { requireRole } from "@/lib/auth/session";
import PermissionDenied from "../../PermissionDenied";
import TeacherScoresEntry from "./score-entry";

export default async function TeacherScoresPage() {
  const gate = await requireRole("teacher", "admin");
  if (gate.status === "forbidden") return <PermissionDenied />;
  return <TeacherScoresEntry />;
}
