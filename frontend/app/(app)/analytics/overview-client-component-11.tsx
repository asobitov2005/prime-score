"use client";

import { DashboardAnalytics } from "./overview-client-dependencies";
import { average } from "./overview-client-component-04";
import { roundWholeBand } from "./overview-client-component-05";

export function skillBand(analytics: DashboardAnalytics, key: "reading" | "listening" | "writing" | "speaking") {
  return roundWholeBand(average(
    analytics.progressSeries
      .map((point) => point[key])
      .filter((value): value is number => typeof value === "number")
      .slice(-10)
  ));
}
