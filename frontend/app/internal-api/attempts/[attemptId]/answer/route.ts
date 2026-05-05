import { NextResponse } from "next/server";

import { saveBackendAttemptAnswer } from "@/lib/server-attempts";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const payload = (await request.json()) as {
      questionId?: string;
      question_id?: string;
      value: string;
    };
    const questionId = payload.questionId ?? payload.question_id;
    if (!questionId) {
      return NextResponse.json({ message: "Question id is required." }, { status: 400 });
    }
    await saveBackendAttemptAnswer(params.attemptId, questionId, payload.value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Answer save failed." }, { status: 500 });
  }
}
