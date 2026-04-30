import { useAuthStore } from "@/store/auth-store";
import { mockReviews, type ReviewItem } from "@/lib/mock-data";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";

const baseUrl = getFrontendClientApiBaseUrl();

type BackendPublicReview = {
  id: string;
  name: string;
  band: string;
  text: string;
  created_at: string;
};

type ReviewSession = {
  userId: string | null;
  name: string;
  phoneNumber: string | null;
  isPremium: boolean;
};

function formatRelativeDate(value: string): string {
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return "Recently";
  }

  const seconds = Math.round((target - Date.now()) / 1000);
  const absSeconds = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(seconds, "second");
  }
  if (absSeconds < 60 * 60) {
    return formatter.format(Math.round(seconds / 60), "minute");
  }
  if (absSeconds < 60 * 60 * 24) {
    return formatter.format(Math.round(seconds / (60 * 60)), "hour");
  }
  if (absSeconds < 60 * 60 * 24 * 7) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24)), "day");
  }
  if (absSeconds < 60 * 60 * 24 * 30) {
    return formatter.format(Math.round(seconds / (60 * 60 * 24 * 7)), "week");
  }
  return formatter.format(Math.round(seconds / (60 * 60 * 24 * 30)), "month");
}

function mapReview(payload: BackendPublicReview): ReviewItem {
  return {
    id: payload.id,
    name: payload.name,
    band: payload.band,
    text: payload.text,
    date: formatRelativeDate(payload.created_at),
  };
}

export async function listPublicReviews(): Promise<ReviewItem[]> {
  try {
    const response = await fetch(`${baseUrl}/reviews`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to load reviews.");
    }
    const payload = (await response.json()) as BackendPublicReview[];
    return payload.map(mapReview);
  } catch {
    return mockReviews;
  }
}

export async function submitPublicReview(
  payload: {
    band: string;
    text: string;
  },
  session: ReviewSession,
): Promise<{ id: string; is_visible: boolean; message: string }> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!session.userId || !accessToken) {
    throw new Error("Authentication is required.");
  }

  const response = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      band: payload.band.trim(),
      text: payload.text.trim(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "Failed to submit review.");
  }

  return (await response.json()) as { id: string; is_visible: boolean; message: string };
}
