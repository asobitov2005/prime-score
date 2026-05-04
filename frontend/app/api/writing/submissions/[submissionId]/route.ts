import { NextResponse } from "next/server";

import { getWritingSubmission } from "@/lib/server-writing";
import { ServerUserApiError } from "@/lib/server-user-auth";

export async function GET(
  _request: Request,
  { params }: { params: { submissionId: string } },
) {
  try {
    const submission = await getWritingSubmission(params.submissionId);
    return NextResponse.json(submission);
  } catch (error) {
    if (error instanceof ServerUserApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Failed to load submission." }, { status: 500 });
  }
}
