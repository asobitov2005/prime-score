import { NextResponse } from "next/server";

import { startBackendAttempt } from "@/lib/server-attempts";
import { ServerUserApiError } from "@/lib/server-user-auth";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      testId: string;
      scope: "full" | "section";
      sectionId?: string;
      mode: "practice" | "exam";
      forceNew?: boolean;
      force_new?: boolean;
    };
    const requestedSectionId = payload.sectionId;
    const hasValidSectionId = Boolean(requestedSectionId && UUID_PATTERN.test(requestedSectionId));
    const normalizedScope = payload.scope === "section" && !hasValidSectionId
      ? "full"
      : payload.scope;

    const result = await startBackendAttempt({
      ...payload,
      scope: normalizedScope,
      sectionId: normalizedScope === "section" && hasValidSectionId ? requestedSectionId : undefined,
      forceNew: payload.forceNew ?? payload.force_new ?? false,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Attempt start failed." }, { status: 500 });
  }
}
