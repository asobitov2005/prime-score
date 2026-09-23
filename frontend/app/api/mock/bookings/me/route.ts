import { NextResponse } from "next/server";
import { ServerUserApiError, requestServerUserApi } from "@/lib/server-user-auth";
import type { OfflineMockBooking } from "@/lib/mock-scheduling";

export async function GET() {
  try {
    const response = await requestServerUserApi<{ items: OfflineMockBooking[] }>("/mock/bookings/me");
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Mock reservations could not be loaded." }, { status: 500 });
  }
}
