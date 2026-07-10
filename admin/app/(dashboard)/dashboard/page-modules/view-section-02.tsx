import type { DashboardPageData } from "./loader";
import { AdminFilterBar } from "./dependencies";

export function DashboardPageSection2({ scope }: { scope: DashboardPageData }) {
  return (
    <AdminFilterBar />
  );
}
