import type { TestFormat } from "@/lib/types";

export interface BackendAdminTest {
  id: string;
  title: string;
  test_type: "reading" | "listening";
  format: TestFormat;
  source: "cambridge" | "real_exam" | "custom";
  source_detail: string;
  access_type: "public" | "premium";
  status: "draft" | "published" | "archived";
  review_status?: "needs_review" | "approved" | "rejected";
  updated_at?: string | null;
  total_questions: number;
  version: number;
}

export interface BackendDraftPayload {
  metadata: {
    title: string;
    type: "reading" | "listening";
    format: TestFormat;
    source: "cambridge" | "real_exam" | "custom";
    source_detail: string;
    access_type: "public" | "premium";
    time_limit_label: string;
  };
  content: Array<{
    id?: string;
    label: string;
    title: string;
    subtitle: string;
    content: string;
    paragraphs: Array<{ id: string; label: string; text: string }>;
    showLabels: boolean;
    media_kind: "text" | "audio";
    audio_url: string;
    audio_duration_seconds?: number | null;
    transcript: string;
    transcript_segments?: Array<{
      id?: string;
      start_sec?: number;
      end_sec?: number;
      text?: string;
    }>;
    transcript_question_locations?: Array<{
      question_id?: string | null;
      question_label?: string;
      question_prompt?: string;
      start_sec?: number;
      end_sec?: number;
      answer_text?: string;
      correct_answer?: string;
    }>;
    marker_count: number;
  }>;
  question_groups: Array<{
    id?: string;
    section_id: string;
    title: string;
    instructions: string;
    options_title?: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    diagram_title?: string;
    diagram_image_url?: string;
    questions: Array<{
      id?: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
}

export interface BackendAdminDraft {
  metadata: {
    title: string;
    type: "reading" | "listening";
    format: TestFormat;
    source: "cambridge" | "real_exam" | "custom";
    source_detail: string;
    status: "draft" | "published" | "archived";
    access_type: "public" | "premium";
    version: number;
    time_limit_label: string;
  };
  content: {
    sections: Array<{
      id: string;
      label: string;
      title: string;
      subtitle: string;
      content: string;
      paragraphs?: Array<{ id: string; label: string; text: string }>;
      showLabels?: boolean;
      media_kind: "text" | "audio";
      audio_url?: string;
      audio_duration_seconds?: number | null;
      transcript?: string;
      transcript_segments?: Array<{
        id?: string;
        start_sec?: number;
        end_sec?: number;
        text?: string;
        confidence?: number;
        drift_start_sec?: number;
        drift_end_sec?: number;
        needs_review?: boolean;
      }>;
      transcript_question_locations?: Array<{
        question_id?: string | null;
        question_label?: string;
        question_prompt?: string;
        start_sec?: number;
        end_sec?: number;
        answer_text?: string;
        correct_answer?: string;
      }>;
      marker_count: number;
    }>;
  };
  questionGroups?: Array<{
    id: string;
    section_id: string;
    title: string;
    instructions: string;
    options_title?: string;
    type_id: string;
    question_start: number;
    question_end: number;
    shared_options: string[];
    question_block?: string;
    answer_block?: string;
    secondary_block?: string;
    raw_content?: string;
    diagram_title?: string;
    diagram_image_url?: string;
    questions: Array<{
      id: string;
      label: string;
      prompt: string;
      accepted_answers: string[];
      explanation: string;
      variants: string[];
    }>;
  }>;
  questions?: Array<{
    id: string;
    section_id: string;
    label: string;
    type_id: string;
    prompt: string;
    accepted_answers: string[];
    explanation: string;
    variants: string[];
  }>;
  review: {
    checklist: Array<{
      id: string;
      label: string;
      status: "ready" | "draft" | "blocked";
      detail: string;
    }>;
    notes: string[];
  };
  decisions: {
    question_bank: {
      label: string;
      state: "not_supported";
      detail: string;
    };
    payment: {
      label: string;
      state: "paused";
      detail: string;
    };
    listening_timer: {
      label: string;
      state: "audio_duration_plus_2_minutes";
      detail: string;
    };
  };
}
