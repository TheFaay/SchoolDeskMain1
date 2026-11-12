import { getParentDashboardData } from "./data";
import { ParentDashboardPage as ParentDashboardView } from "./parent-dashboard";

export const instant = false;

export default async function ParentDashboardPage() {
  const data = await getParentDashboardData();

  return <ParentDashboardView data={data} />;
}
