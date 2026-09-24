import { NextResponse } from "next/server";
import { ServerUserApiError, requestServerUserApi } from "@/lib/server-user-auth";
import type { OnlineMockDetail } from "@/lib/mock-catalog";

export async function GET(_request: Request, { params }: { params: { bundleId: string } }) {
  try {
    const result = await requestServerUserApi<OnlineMockDetail>(`/mock/online-mocks/${encodeURIComponent(params.bundleId)}`);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof ServerUserApiError ? error.message : "Full Mock could not be loaded." }, { status: error instanceof ServerUserApiError ? error.status : 502 });
  }
}
