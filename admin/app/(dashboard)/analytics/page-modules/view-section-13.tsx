import type { AnalyticsPageData } from "./loader";
import { Activity, AdminFilterBar, Badge, BarChart3, Card, CardContent, CardDescription, CardHeader, CardTitle, DauTrendChart, HourlyDistributionChart, ProgressBar, SectionHeader, Target, TrendingUp, Users, WeekdayActivityChart } from "./dependencies";
import { percentValue } from "./shared";
import { AnalyticsPageSection2 } from "./view-section-02";
import { AnalyticsPageSection3 } from "./view-section-03";
import { AnalyticsPageSection4 } from "./view-section-04";
import { AnalyticsPageSection5 } from "./view-section-05";
import { AnalyticsPageSection6 } from "./view-section-06";
import { AnalyticsPageSection7 } from "./view-section-07";
import { AnalyticsPageSection8 } from "./view-section-08";
import { AnalyticsPageSection9 } from "./view-section-09";
import { AnalyticsPageSection10 } from "./view-section-10";
import { AnalyticsPageSection11 } from "./view-section-11";
import { AnalyticsPageSection12 } from "./view-section-12";
import { AnalyticsPageSection13 } from "./view-section-13";

export function AnalyticsPageSection1({ scope }: { scope: AnalyticsPageData }) {
  const { report } = scope;
  return (
    (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
          <AnalyticsPageSection2 scope={scope} />
          
          <AnalyticsPageSection3 scope={scope} />
    
          <AnalyticsPageSection4 scope={scope} />
          <AnalyticsPageSection5 scope={scope} />
    
          <AnalyticsPageSection6 scope={scope} />
          <AnalyticsPageSection7 scope={scope} />
    
          <AnalyticsPageSection8 scope={scope} />
    
          <AnalyticsPageSection9 scope={scope} />
          <AnalyticsPageSection10 scope={scope} />
    
          <AnalyticsPageSection11 scope={scope} />
          <AnalyticsPageSection12 scope={scope} />
    
          <AnalyticsPageSection13 scope={scope} />
        </div>
      )
  );
}
