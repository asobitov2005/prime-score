import { NextResponse } from "next/server";

import { startBackendAttempt } from "@/lib/server-attempts";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      testId: string;
      scope: "full" | "section";
      sectionId?: string;
      mode: "practice" | "exam";
    };
    const result = await startBackendAttempt(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: "Attempt start failed." }, { status: 500 });
  }
}
