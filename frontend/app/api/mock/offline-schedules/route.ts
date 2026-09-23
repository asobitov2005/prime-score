import { NextResponse } from "next/server";
import { getFrontendServerApiBaseUrl } from "@/lib/api-base";

export async function GET(request: Request) {
  const requestedUrl = new URL(request.url);
  const from = requestedUrl.searchParams.get("from");
  const to = requestedUrl.searchParams.get("to");
  if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) {
    return NextResponse.json({ detail: "A valid date range is required." }, { status: 400 });
  }

  const backendUrl = new URL(`${getFrontendServerApiBaseUrl()}/mock/offline-schedules`);
  backendUrl.searchParams.set("from", from);
  backendUrl.searchParams.set("to", to);

  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const payload = await response.json().catch(() => ({ detail: "Schedule service returned an invalid response." }));
    return NextResponse.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ detail: "Mock schedules are temporarily unavailable." }, { status: 502 });
  }
}
