import type { DashboardPageData } from "./loader";
import { AlertTriangle, ArrowRight, Badge, Brain, Button, Card, CardContent, Gauge, Link, OverallBandKpiCard, Play, PremiumFeatureGate, SkillPerformance, StreakHeatmap, StudyTimeCard, Target, WelcomeHeader, XpSummaryCard, cn } from "./dependencies";
import { LeaderboardPreviewCard } from "./shared";
import { DashboardPageSection4 } from "./view-section-04";
import { DashboardPageSection5 } from "./view-section-05";
import { DashboardPageSection6 } from "./view-section-06";
import { DashboardPageSection7 } from "./view-section-07";
import { DashboardPageSection8 } from "./view-section-08";
import { DashboardPageSection9 } from "./view-section-09";
import { DashboardPageSection10 } from "./view-section-10";

export function DashboardPageSection3({ scope }: { scope: DashboardPageData }) {
  const { analytics, xpSummary, leaderboardPreview, inProgressTest, recTitle, recDesc, recHref, recBtnText, attempts, writingHistory, activity, diagnosisAccent, weaknessDiagnosis } = scope;
  return (
    <div className="space-y-6">
            <DashboardPageSection4 scope={scope} />
    
            <DashboardPageSection5 scope={scope} />
    
            <DashboardPageSection6 scope={scope} />
            <DashboardPageSection7 scope={scope} />
    
            <DashboardPageSection8 scope={scope} />
    
            <DashboardPageSection9 scope={scope} />
            <DashboardPageSection10 scope={scope} />
          </div>
  );
}
