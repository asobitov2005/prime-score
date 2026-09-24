const TIME_ZONE = "Asia/Tashkent";

export type OnlineMockCard = {
  id: string;
  title: string;
  description: string | null;
  module: "academic";
  requires_premium: boolean;
  skills: string[];
  stage_count: number;
  total_seconds: number | null;
  duration_minutes: number | null;
};

export type OnlineMockStage = {
  key: "listening" | "reading" | "writing_task_1" | "writing_task_2";
  resource_id: string;
  resource_type: "test" | "writing_task";
  title: string;
  launch_url: string;
  time_limit_seconds: number | null;
};

export type OnlineMockDetail = OnlineMockCard & { stages: OnlineMockStage[] };

export function safeMockLaunch(stage: OnlineMockStage): string | null {
  if (!stage.launch_url.startsWith("/") || stage.launch_url.startsWith("//")) return null;
  try {
    const url = new URL(stage.launch_url, "https://mock.invalid");
    if (url.origin !== "https://mock.invalid" || url.hash) return null;
    if (stage.key === "listening" || stage.key === "reading") {
      if (stage.resource_type !== "test" || url.pathname !== `/exam-preview/${stage.key}` || url.searchParams.get("testId") !== stage.resource_id || url.searchParams.get("start") !== "1" || url.searchParams.get("mode") !== "exam") return null;
    } else if (stage.key === "writing_task_1" || stage.key === "writing_task_2") {
      if (stage.resource_type !== "writing_task" || url.pathname !== "/exam-preview/writing" || url.searchParams.get("taskId") !== stage.resource_id) return null;
    } else return null;
    return `${url.pathname}${url.search}`;
  } catch { return null; }
}

export function mockDateParts(value: string) {
  const date = new Date(value);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, day: "2-digit" }).format(date),
    full: new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, dateStyle: "full" }).format(date),
  };
}

export function mockTimeRange(startsAt: string, minutes: number): string {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + minutes * 60_000);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function mockDuration(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return "Duration not set";
  const seconds = Math.round(minutes * 60);
  const hours = Math.floor(seconds / 3600);
  const remainder = Math.floor((seconds % 3600) / 60);
  const tail = seconds % 60;
  return [hours ? `${hours}h` : "", remainder ? `${remainder}m` : "", tail ? `${tail}s` : ""].filter(Boolean).join(" ");
}

export function mockPageNumbers(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, Math.max(0, totalPages)) }, (_, index) => start + index);
}
