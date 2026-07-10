import type { DashboardPageData } from "./loader";
import { AlertTriangle, ArrowRight, Badge, BookOpenText, BookmarkToggleButton, Brain, Button, Card, CardContent, EmptyState, Gauge, Headphones, Link, OverallBandKpiCard, PenSquare, Play, PremiumFeatureGate, SkillPerformance, StreakHeatmap, StudyTimeCard, Target, WelcomeHeader, XpSummaryCard, cn, getTestSourceLabel } from "./dependencies";
import { LeaderboardPreviewCard, getDashboardBookmarkItem } from "./shared";
import { DashboardPageSection2 } from "./view-section-02";
import { DashboardPageSection3 } from "./view-section-10";
import { DashboardPageSection11 } from "./view-section-11";

export function DashboardPageSection1({ scope }: { scope: DashboardPageData }) {
  const { analytics, xpSummary, leaderboardPreview, inProgressTest, recTitle, recDesc, recHref, recBtnText, attempts, writingHistory, activity, diagnosisAccent, weaknessDiagnosis, recentActivity, featuredTests } = scope;
  return (
    (
        <div className="space-y-5 pb-12">
    
          <DashboardPageSection2 scope={scope} />
          <DashboardPageSection3 scope={scope} />
    
          <DashboardPageSection11 scope={scope} />
    
        </div>
      )
  );
}
