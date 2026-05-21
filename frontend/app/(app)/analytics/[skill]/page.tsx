import { notFound } from "next/navigation";
import { getDashboardAnalytics } from "@/lib/server-me";
import SkillAnalyticsClient from "./skill-analytics-client";

const validSkills = ["reading", "listening", "writing", "speaking"] as const;

type SkillParam = (typeof validSkills)[number];

export default async function SkillAnalyticsPage({ params }: { params: Promise<{ skill: string }> }) {
  const { skill } = await params;
  if (!validSkills.includes(skill as SkillParam)) {
    notFound();
  }

  const analytics = await getDashboardAnalytics();

  return <SkillAnalyticsClient skill={skill as SkillParam} initialAnalytics={analytics} />;
}
