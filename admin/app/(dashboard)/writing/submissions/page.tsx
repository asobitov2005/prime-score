"use client";

import { WritingSubmissionsPageView } from "./page-view";
import { useWritingSubmissionsPageScope } from "./page-scope";

export function WritingSubmissionsPage() {
  const scope = useWritingSubmissionsPageScope();
  return <WritingSubmissionsPageView scope={scope} />;
}

export default WritingSubmissionsPage;
