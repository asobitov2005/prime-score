import { NextResponse } from "next/server";

import { saveBackendAttemptProgress } from "@/lib/server-attempts";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const payload = (await request.json()) as {
      timeSpentSec?: number;
      time_spent_sec?: number;
      activeQuestionId?: string;
      active_question_id?: string;
      textHighlights?: Record<string, Array<{ id: string; start: number; end: number }>>;
      text_highlights?: Record<string, Array<{ id: string; start: number; end: number }>>;
      uiState?: { theme?: "light" | "dark"; splitRatio?: number; fontScale?: number };
      ui_state?: { theme?: "light" | "dark"; split_ratio?: number; font_scale?: number };
    };

    await saveBackendAttemptProgress(params.attemptId, {
      timeSpentSec: payload.timeSpentSec ?? payload.time_spent_sec,
      activeQuestionId: payload.activeQuestionId ?? payload.active_question_id,
      textHighlights: payload.textHighlights ?? payload.text_highlights,
      uiState: payload.uiState
        ?? (payload.ui_state
          ? {
              theme: payload.ui_state.theme ?? undefined,
              splitRatio: payload.ui_state.split_ratio ?? undefined,
              fontScale: payload.ui_state.font_scale ?? undefined,
            }
          : undefined),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Progress save failed." }, { status: 500 });
  }
}
