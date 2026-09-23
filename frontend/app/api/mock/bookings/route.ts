import { NextResponse } from "next/server";
import { ServerUserApiError, requestServerUserApi } from "@/lib/server-user-auth";
import type { OfflineMockBooking } from "@/lib/mock-scheduling";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { schedule_id?: unknown };
    if (typeof payload.schedule_id !== "string" || !UUID_PATTERN.test(payload.schedule_id)) {
      return NextResponse.json({ detail: "A valid mock schedule is required." }, { status: 400 });
    }

    let responseStatus = 201;
    const booking = await requestServerUserApi<OfflineMockBooking>(
      "/mock/bookings",
      {
        method: "POST",
        body: JSON.stringify({ schedule_id: payload.schedule_id }),
      },
      { onResponse: (response) => { responseStatus = response.status; } },
    );
    return NextResponse.json(booking, {
      status: responseStatus,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    return NextResponse.json({ detail: "Mock reservation could not be completed." }, { status: 500 });
  }
}
