"use client";

import { TestsPageView } from "./page-view";
import { useTestsPageScope } from "./page-scope";

export function TestsPage() {
  const scope = useTestsPageScope();
  return <TestsPageView scope={scope} />;
}

export default TestsPage;
