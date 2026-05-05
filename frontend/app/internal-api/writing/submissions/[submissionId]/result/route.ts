import { NextResponse } from "next/server";

import { getWritingSubmissionResult } from "@/lib/server-writing";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function GET(
  _request: Request,
  { params }: { params: { submissionId: string } }
) {
  try {
    const result = await getWritingSubmissionResult(params.submissionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to load writing result." }, { status: 500 });
  }
}
