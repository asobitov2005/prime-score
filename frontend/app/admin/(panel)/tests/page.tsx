"use client";

import { AdminTestsPageView } from "./page-view";
import { useAdminTestsPageScope } from "./page-scope";

export function AdminTestsPage() {
  const scope = useAdminTestsPageScope();
  return <AdminTestsPageView scope={scope} />;
}

export default AdminTestsPage;
