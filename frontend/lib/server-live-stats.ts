import { FRONTEND_API_TIMEOUT_MS, getFrontendServerApiBaseUrl } from "@/lib/api-base";

const baseUrl = getFrontendServerApiBaseUrl();

type BackendLandingLiveStats = {
  total_users: number;
  refreshed_at: string;
};

export async function getLandingTotalUsers(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FRONTEND_API_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/reviews/live-stats`, {
        next: {
          revalidate: 75,
          tags: ["landing-live-stats"],
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error("Failed to load landing live stats.");
    }

    const payload = (await response.json()) as BackendLandingLiveStats;
    return Math.max(0, Math.round(payload.total_users));
  } catch {
    return 0;
  }
}
