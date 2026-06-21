import { NextResponse } from "next/server";

import { requestServerUserApi } from "@/lib/server-user-auth";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function POST(
  request: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const payload = await request.json();

    await requestServerUserApi(`/attempts/${params.attemptId}/events`, {
      method: "POST",
      headers: request.headers.get("authorization")
        ? { Authorization: request.headers.get("authorization") as string }
        : undefined,
      body: JSON.stringify(payload),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Event save failed." }, { status: 500 });
  }
}
