import { NextResponse } from "next/server";

import { startBackendAttempt } from "@/lib/server-attempts";
import { ServerUserApiError } from "@/lib/server-user-auth";

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
    const result = await startBackendAttempt({
      ...payload,
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
