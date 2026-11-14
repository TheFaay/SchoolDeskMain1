import { redirect } from "next/navigation";

export default function LegacyTeacherScoresPage() {
  redirect("/dashboard/teacher/scores");
}
