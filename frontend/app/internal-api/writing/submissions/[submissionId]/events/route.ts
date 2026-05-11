import { requestServerUserApi, ServerUserApiError } from "@/lib/server-user-auth";
const encoder = new TextEncoder();

function stepIndexFor(status: string, tick: number): number {
  if (status === "queued") return 0;
  if (status === "completed" || status === "failed") return 5;
  return Math.min(5, 1 + tick);
}

async function fetchSubmission(submissionId: string): Promise<{ status?: string; error_message?: string | null }> {
  return requestServerUserApi<{ status?: string; error_message?: string | null }>(
    `/writing/submissions/${submissionId}`,
    { method: "GET" },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { submissionId: string } }
) {
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let tick = 0;
      const send = (payload: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        while (!closed) {
          const submission = await fetchSubmission(params.submissionId);
          const status = String(submission.status ?? "").toLowerCase();
          send({
            status,
            stepIndex: stepIndexFor(status, tick),
            errorMessage: submission.error_message ?? null,
          });

          if (status === "completed" || status === "failed") {
            break;
          }

          tick += 1;
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (error) {
        if (error instanceof ServerUserApiError && (error.status === 401 || error.status === 403)) {
          send({
            status: "failed",
            stepIndex: 5,
            errorMessage: "Your session expired. Please sign in again.",
          });
        }
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
