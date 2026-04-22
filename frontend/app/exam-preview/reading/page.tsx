import { ReadingExamPreview } from "@/components/exam/reading-exam-preview";

interface ReadingExamPreviewPageProps {
  searchParams?: {
    mode?: string;
  };
}

export default function ReadingExamPreviewPage({ searchParams }: ReadingExamPreviewPageProps) {
  const mode = searchParams?.mode === "practice" ? "practice" : "exam";
  return <ReadingExamPreview mode={mode} />;
}
