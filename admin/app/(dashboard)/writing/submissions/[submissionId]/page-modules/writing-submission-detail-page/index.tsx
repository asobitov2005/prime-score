"use client";
import { useWritingSubmissionDetailPageController } from "./controller";
import { WritingSubmissionDetailPageView } from "./view";

export function WritingSubmissionDetailPage(props: { params: { submissionId: string } }) {
  const scope = useWritingSubmissionDetailPageController(props);
  return <WritingSubmissionDetailPageView scope={scope} />;
}
