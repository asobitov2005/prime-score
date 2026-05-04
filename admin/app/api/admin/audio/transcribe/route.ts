import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_ACCESS_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveBackendAdminApiBaseUrl() {
  const configured = (process.env.ADMIN_API_INTERNAL_BASE_URL || "http://127.0.0.1:8000/api/admin")
    .trim()
    .replace(/\/$/, "");

  try {
    const url = new URL(configured);
    const pointsToAdminApp =
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.port === "3101";
    if (pointsToAdminApp) {
      return "http://127.0.0.1:8000/api/admin";
    }
  } catch {}

  return configured || "http://127.0.0.1:8000/api/admin";
}

function buildTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

export async function POST(request: Request) {
  const token = cookies().get(ADMIN_ACCESS_COOKIE)?.value ?? null;
  if (!token) {
    return NextResponse.json({ detail: "Admin session is missing." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON payload." }, { status: 400 });
  }

  const { controller, timeoutId } = buildTimeoutSignal(155 * 1000);

  try {
    const response = await fetch(`${resolveBackendAdminApiBaseUrl()}/audio/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error && error.name === "AbortError"
        ? "Transcript generation exceeded 155 seconds."
        : "Transcript proxy request failed.";
    return NextResponse.json({ detail }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
