import { ADMIN_REFRESH_COOKIE, AdminIdentity, AdminTestDraftState, AdminTestSummary, cookies, getServerAdminAccessToken, isAdminAuthFailureStatus, normalizeAdminTestSourceDetail, refreshServerAdminAccessToken } from "./server-data-dependencies";
import { ADMIN_REQUEST_MAX_ATTEMPTS, BackendAdminDraft, BackendAdminTest, baseUrl, requestJsonFromAdminApi, sanitizeListeningSectionContent, sanitizeListeningSectionTitle } from "./server-data-part-01";

export async function requestAdmin<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const buildHeaders = (token: string | null): Record<string, string> => (
    token
      ? { Authorization: `Bearer ${token}` }
      : {}
  );
  let accessToken = await getServerAdminAccessToken();

  for (let attempt = 1; attempt <= ADMIN_REQUEST_MAX_ATTEMPTS; attempt += 1) {
    try {
      let response = await requestJsonFromAdminApi(url, buildHeaders(accessToken));
      if (isAdminAuthFailureStatus(response.status)) {
        const refreshToken = cookies().get(ADMIN_REFRESH_COOKIE)?.value ?? null;
        const refreshedAccessToken = refreshToken
          ? await refreshServerAdminAccessToken(refreshToken)
          : null;
        if (refreshedAccessToken) {
          accessToken = refreshedAccessToken;
          response = await requestJsonFromAdminApi(url, buildHeaders(accessToken));
        }
      }
      const text = response.text;

      if (response.status < 200 || response.status >= 300) {
        console.error(`Admin API request failed for ${path} with status ${response.status}: ${text}`);
        const error = new Error(`Admin API request failed for ${path}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
      const isRetryableStatus = status == null || status >= 500;
      const isLastAttempt = attempt === ADMIN_REQUEST_MAX_ATTEMPTS;
      if (!isRetryableStatus || isLastAttempt) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }

  throw new Error(`Admin API request failed for ${path}`);
}

export type BackendAdminIdentity = {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin";
  is_active: boolean;
};

export function mapAdminIdentity(admin: BackendAdminIdentity): AdminIdentity {
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    isActive: admin.is_active
  };
}

export async function getAdminMe(): Promise<AdminIdentity | null> {
  try {
    const admin = await requestAdmin<BackendAdminIdentity>("/auth/me");
    return mapAdminIdentity(admin);
  } catch {
    return null;
  }
}

export function mapAdminTest(test: BackendAdminTest): AdminTestSummary {
  return {
    id: test.id,
    title: test.title,
    type: test.test_type,
    format: test.format ?? "full",
    source: test.source,
    sourceDetail: normalizeAdminTestSourceDetail(test.source, test.source_detail),
    accessType: test.access_type,
    status: test.status,
    reviewStatus: test.review_status ?? "needs_review",
    updatedAt: test.updated_at ?? new Date().toISOString(),
    questions: test.total_questions,
    version: test.version
  };
}

export function mapAdminDraft(draft: BackendAdminDraft): AdminTestDraftState {
  return {
    metadata: {
      title: draft.metadata.title,
      type: draft.metadata.type,
      format: draft.metadata.format ?? "full",
      source: draft.metadata.source,
      sourceDetail: normalizeAdminTestSourceDetail(draft.metadata.source, draft.metadata.source_detail),
      accessType: draft.metadata.access_type,
      status: draft.metadata.status,
      version: draft.metadata.version,
      timeLimitLabel: draft.metadata.time_limit_label
    },
    content: {
      sections: draft.content.sections.map((section) => ({
        id: section.id,
        label: section.label,
        title: sanitizeListeningSectionTitle(draft.metadata.type, section.title),
        subtitle: section.subtitle,
        content: sanitizeListeningSectionContent(draft.metadata.type, section.content),
        paragraphs: section.paragraphs,
        showLabels: section.showLabels,
        mediaKind: section.media_kind,
        audioUrl: section.audio_url ?? "",
        audioDurationSeconds: section.audio_duration_seconds ?? null,
        transcript: section.transcript ?? "",
        transcriptSegments: (section.transcript_segments ?? []).map((segment, index) => ({
          id: String(segment.id ?? `segment-${index + 1}`),
          startSec: Number(segment.start_sec ?? 0),
          endSec: Number(segment.end_sec ?? segment.start_sec ?? 0),
          text: String(segment.text ?? ""),
          confidence: segment.confidence == null ? undefined : Number(segment.confidence),
          driftStartSec: segment.drift_start_sec == null ? undefined : Number(segment.drift_start_sec),
          driftEndSec: segment.drift_end_sec == null ? undefined : Number(segment.drift_end_sec),
          needsReview: segment.needs_review == null ? undefined : Boolean(segment.needs_review),
        })),
        transcriptQuestionLocations: (section.transcript_question_locations ?? []).map((location) => ({
          questionId: location.question_id ?? undefined,
          questionLabel: String(location.question_label ?? ""),
          questionPrompt: String(location.question_prompt ?? ""),
          startSec: Number(location.start_sec ?? 0),
          endSec: Number(location.end_sec ?? location.start_sec ?? 0),
          answerText: String(location.answer_text ?? ""),
          correctAnswer: String(location.correct_answer ?? ""),
        })),
        markerCount: section.marker_count
      }))
    },
    questionGroups: (draft.questionGroups ?? []).map(group => ({
      id: group.id,
      sectionId: group.section_id,
      title: group.title,
      instructions: group.instructions,
      typeId: group.type_id,
      questionStart: group.question_start,
      questionEnd: group.question_end,
      sharedOptions: group.shared_options,
      questionBlock: group.question_block,
      answerBlock: group.answer_block,
      secondaryBlock: group.secondary_block,
      rawContent: group.raw_content,
      questions: group.questions.map(q => ({
        id: q.id,
        label: q.label,
        prompt: q.prompt,
        acceptedAnswers: q.accepted_answers,
        explanation: q.explanation,
        variants: q.variants
      }))
    })),
    questions: (draft.questions ?? []).map((question) => ({
      id: question.id,
      label: question.label,
      prompt: question.prompt,
      acceptedAnswers: question.accepted_answers,
      explanation: question.explanation,
      variants: question.variants
    })),
    review: {
      checklist: draft.review.checklist,
      notes: draft.review.notes
    },
    decisions: {
      questionBank: draft.decisions.question_bank,
      payment: draft.decisions.payment,
      listeningTimer: draft.decisions.listening_timer
    }
  };
}

export async function getAdminTests(): Promise<AdminTestSummary[]> {
  try {
    const items = await requestAdmin<BackendAdminTest[]>("/tests");
    return items.map(mapAdminTest);
  } catch (error) {
    console.error("Failed to fetch admin tests:", error);
    return [];
  }
}
