import { mockReviews, type ReviewItem } from "@/lib/mock-data";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

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

function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "PrimeScore", lastName: "Student" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "PrimeScore",
    lastName: parts.slice(1).join(" "),
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
  if (!session.userId) {
    throw new Error("Authentication is required.");
  }

  const { firstName, lastName } = splitName(session.name);
  const response = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-User-Id": session.userId,
      "X-Debug-First-Name": firstName,
      "X-Debug-Last-Name": lastName,
      "X-Debug-Username": session.phoneNumber ?? "",
      "X-Debug-Role": "user",
      "X-Debug-Is-Premium": String(session.isPremium),
      "X-Debug-Show-On-Leaderboard": "true",
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
