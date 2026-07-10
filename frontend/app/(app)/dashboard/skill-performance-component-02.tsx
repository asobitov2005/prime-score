"use client";

import { DashboardTrendPoint } from "./skill-performance-dependencies";

export interface SkillCardData {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  score: string;
  badgeText: string;
  badgeClass: string;
  sparklineColor: string;
  sparkPoints: DashboardTrendPoint[];
  lastTestText: string;
  xpText: string;
  href: string;
}
