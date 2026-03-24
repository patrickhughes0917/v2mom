import DashboardClient from "@/components/DashboardClient";
import { v2momData } from "@/lib/v2mom-data";

export default function DashboardPage() {
  return <DashboardClient data={v2momData} />;
}
