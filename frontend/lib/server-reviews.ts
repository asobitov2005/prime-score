import { mockReviews, type ReviewItem } from "@/lib/mock-data";

const baseUrl = (
  process.env.API_INTERNAL_BASE_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

type BackendPublicReview = {
  id: string;
  name: string;
  band: string;
  text: string;
  created_at: string;
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

export async function getPublicReviews(limit = 6): Promise<ReviewItem[]> {
  try {
    const response = await fetch(`${baseUrl}/reviews`, {
      next: { revalidate: 3600, tags: ["public-reviews"] },
    });

    if (!response.ok) {
      throw new Error("Failed to load public reviews.");
    }

    const payload = (await response.json()) as BackendPublicReview[];
    return payload.map(mapReview).slice(0, limit);
  } catch {
    return mockReviews.slice(0, limit);
  }
}
