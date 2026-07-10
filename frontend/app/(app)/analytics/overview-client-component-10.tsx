"use client";

import { DashboardAnalytics } from "./overview-client-dependencies";
import { average } from "./overview-client-component-04";
import { roundWholeBand } from "./overview-client-component-05";
import { toLocalDayKey } from "./overview-client-component-08";
import { formatTrendDayLabel } from "./overview-client-component-09";

export function buildTenDayBandTrend(progressSeries: DashboardAnalytics["progressSeries"]) {
  const pointsByDay = new Map<string, DashboardAnalytics["progressSeries"]>();

  progressSeries.forEach((point) => {
    const occurredAt = new Date(point.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return;
    }

    const dayKey = toLocalDayKey(occurredAt);
    pointsByDay.set(dayKey, [...(pointsByDay.get(dayKey) ?? []), point]);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 10 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (9 - index));
    const dayPoints = pointsByDay.get(toLocalDayKey(day)) ?? [];

    const reading = roundWholeBand(average(dayPoints.map((point) => point.reading).filter((value): value is number => typeof value === "number")));
    const listening = roundWholeBand(average(dayPoints.map((point) => point.listening).filter((value): value is number => typeof value === "number")));
    const writing = roundWholeBand(average(dayPoints.map((point) => point.writing).filter((value): value is number => typeof value === "number")));
    const speaking = roundWholeBand(average(dayPoints.map((point) => point.speaking).filter((value): value is number => typeof value === "number")));

    return {
      date: formatTrendDayLabel(day),
      overall: roundWholeBand(average([reading, listening, writing, speaking].filter((value): value is number => value !== null))) ?? 0,
      reading: reading ?? 0,
      listening: listening ?? 0,
      writing: writing ?? 0,
      speaking: speaking ?? 0,
    };
  });
}
