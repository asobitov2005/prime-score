import { requestJson, uploadAdminFile } from "@/lib/api/core";
import type {
  AdminTranscriptQuestionLocation,
  AdminTranscriptSegment,
} from "@/lib/types";

interface BackendTranscriptResponse {
  transcript: string;
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
}

interface BackendTranscriptJob {
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  result?: BackendTranscriptResponse | null;
  error?: string | null;
}

export function mapTranscriptSegments(
  segments: BackendTranscriptResponse["transcript_segments"],
): AdminTranscriptSegment[] {
  return (segments ?? [])
    .filter(
      (segment) =>
        typeof segment?.text === "string" && segment.text.trim().length > 0,
    )
    .map((segment, index) => ({
      id: String(segment.id ?? `segment-${index + 1}`),
      startSec: Math.max(0, Number(segment.start_sec ?? 0)),
      endSec: Math.max(
        0,
        Number(segment.end_sec ?? segment.start_sec ?? 0),
      ),
      text: String(segment.text ?? "").trim(),
      confidence:
        segment.confidence == null ? undefined : Number(segment.confidence),
      driftStartSec:
        segment.drift_start_sec == null
          ? undefined
          : Number(segment.drift_start_sec),
      driftEndSec:
        segment.drift_end_sec == null
          ? undefined
          : Number(segment.drift_end_sec),
      needsReview:
        segment.needs_review == null
          ? undefined
          : Boolean(segment.needs_review),
    }));
}

export function mapTranscriptQuestionLocations(
  locations: BackendTranscriptResponse["transcript_question_locations"],
): AdminTranscriptQuestionLocation[] {
  return (locations ?? [])
    .filter(
      (location) =>
        typeof location?.question_label === "string" &&
        location.question_label.trim().length > 0,
    )
    .map((location) => ({
      questionId: location.question_id ?? undefined,
      questionLabel: String(location.question_label ?? "").trim(),
      questionPrompt: String(location.question_prompt ?? "").trim(),
      startSec: Math.max(0, Number(location.start_sec ?? 0)),
      endSec: Math.max(
        0,
        Number(location.end_sec ?? location.start_sec ?? 0),
      ),
      answerText: String(location.answer_text ?? "").trim(),
      correctAnswer: String(location.correct_answer ?? "").trim(),
    }));
}

export const transcriptApi = {
  uploadImage: (file: File) => uploadAdminFile("/images/upload", file),
  uploadAudio: (file: File) => uploadAdminFile("/audio/upload", file),

  async generateListeningTranscript(input: {
    audioUrl: string;
    audioFilename?: string;
    audioContentType?: string;
    sectionLabel?: string;
    sectionTitle?: string;
    transcript?: string;
    transcriptSegments?: AdminTranscriptSegment[];
    onProgress?: (state: { value: number; label: string }) => void;
    onJobId?: (jobId: string) => void;
    questions: Array<{
      questionId?: string;
      questionLabel: string;
      questionPrompt: string;
      acceptedAnswers: string[];
    }>;
  }): Promise<{
    transcript: string;
    transcriptSegments: AdminTranscriptSegment[];
    transcriptQuestionLocations: AdminTranscriptQuestionLocation[];
  }> {
    const started = await requestJson<{ job_id: string; status: string }>(
      "/audio/transcribe/jobs",
      {
        method: "POST",
        body: JSON.stringify({
          audio_url: input.audioUrl,
          audio_filename: input.audioFilename,
          audio_content_type: input.audioContentType,
          section_label: input.sectionLabel,
          section_title: input.sectionTitle,
          transcript: input.transcript,
          transcript_segments: (input.transcriptSegments ?? []).map(
            (segment) => ({
              id: segment.id,
              start_sec: segment.startSec,
              end_sec: segment.endSec,
              text: segment.text,
            }),
          ),
          questions: input.questions.map((question) => ({
            question_id: question.questionId,
            question_label: question.questionLabel,
            question_prompt: question.questionPrompt,
            accepted_answers: question.acceptedAnswers,
          })),
        }),
      },
    );
    input.onJobId?.(started.job_id);
    input.onProgress?.({ value: 8, label: "Queued for transcription" });

    let response: BackendTranscriptResponse | null = null;
    for (let poll = 0; poll < 180; poll += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = await requestJson<BackendTranscriptJob>(
        `/audio/transcribe/jobs/${started.job_id}`,
      );
      input.onProgress?.({
        value: job.status === "queued" ? 10 : Math.min(94, 12 + poll * 2),
        label: progressLabel(job.status),
      });
      if (job.status === "completed" && job.result) {
        response = job.result;
        break;
      }
      if (job.status === "failed" || job.status === "cancelled") {
        throw new Error(
          job.error?.trim() ||
            `Transcript generation ${job.status}.`,
        );
      }
    }

    if (!response) {
      const finalJob = await requestJson<BackendTranscriptJob>(
        `/audio/transcribe/jobs/${started.job_id}`,
      );
      if (finalJob.status === "completed" && finalJob.result) {
        response = finalJob.result;
      } else if (
        finalJob.status === "failed" ||
        finalJob.status === "cancelled"
      ) {
        throw new Error(
          finalJob.error?.trim() ||
            `Transcript generation ${finalJob.status}.`,
        );
      }
    }
    if (!response) {
      throw new Error(
        "Transcript generation is still running. Try again in a moment.",
      );
    }
    input.onProgress?.({ value: 100, label: "Transcript ready" });
    return {
      transcript: response.transcript ?? "",
      transcriptSegments: mapTranscriptSegments(response.transcript_segments),
      transcriptQuestionLocations: mapTranscriptQuestionLocations(
        response.transcript_question_locations,
      ),
    };
  },

  async cancelListeningTranscriptJob(jobId: string): Promise<void> {
    await requestJson<BackendTranscriptJob>(
      `/audio/transcribe/jobs/${jobId}/cancel`,
      { method: "POST" },
    );
  },
};

function progressLabel(status: string): string {
  if (status === "queued") return "Preparing audio...";
  if (status === "running") return "Generating transcript and timestamps...";
  if (status === "completed") return "Finalizing transcript...";
  return "Processing transcript...";
}
