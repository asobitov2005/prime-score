import { NextResponse } from "next/server";

import { submitBackendAttempt } from "@/lib/server-attempts";

export async function POST(
  _request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    await submitBackendAttempt(params.attemptId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Attempt submit failed." }, { status: 500 });
  }
}
