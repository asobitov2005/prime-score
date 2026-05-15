import { buildLlmsTxt, textResponse } from "@/lib/llms-text";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  return textResponse(buildLlmsTxt());
}
