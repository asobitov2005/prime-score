import { NextResponse } from "next/server";

import { submitBackendAttempt } from "@/lib/server-attempts";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  const payload = (await request.json().catch(() => null)) as { confirm?: boolean; reason?: string } | null;
  if (!payload?.confirm) {
    return NextResponse.json({ message: "Submit confirmation is required." }, { status: 400 });
  }

  try {
    await submitBackendAttempt(
      params.attemptId,
      payload.reason ?? "user_confirmed",
      request.headers.get("authorization")
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Attempt submit failed." }, { status: 500 });
  }
}
