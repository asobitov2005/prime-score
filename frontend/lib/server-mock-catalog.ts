import { NextResponse } from "next/server";
import { getFrontendServerApiBaseUrl } from "@/lib/api-base";

export async function proxyMockCatalog(request: Request, catalog: "online-mocks" | "offline-schedules") {
  const input = new URL(request.url);
  const target = new URL(`${getFrontendServerApiBaseUrl()}/mock/${catalog}`);
  for (const [name, fallback, maximum] of [["page", 1, 1_000_000], ["page_size", 6, 100]] as const) {
    const raw = input.searchParams.get(name);
    const value = raw === null ? fallback : Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > maximum) return NextResponse.json({ detail: `Invalid ${name}.` }, { status: 400 });
    target.searchParams.set(name, String(value));
  }
  if (catalog === "offline-schedules") {
    const from = input.searchParams.get("from");
    const to = input.searchParams.get("to");
    if (from || to) {
      if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) return NextResponse.json({ detail: "A valid date range is required." }, { status: 400 });
      target.searchParams.set("from", from);
      target.searchParams.set("to", to);
    }
  }
  try {
    const response = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ detail: "Mock sessions are temporarily unavailable." }, { status: 502 });
  }
}
