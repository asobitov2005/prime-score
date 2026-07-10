import type { DashboardPageData } from "./loader";
import { Activity, AdminFilterBar, AttemptsByDayChart, Badge, BandDistributionChart, BarChart3, Card, CardContent, CardDescription, CardHeader, CardTitle, CreditCard, FileText, Link, PaymentSplitChart, PrimePremiumIcon, ProgressBar, RegistrationTrendChart, RevenueTrendChart, SectionHeader, StatusSplitChart, TrendingUp, TypeSplitChart, Users, buttonClassName } from "./dependencies";
import { MetricCard, formatMoney, formatNumber } from "./shared";
import { DashboardPageSection2 } from "./view-section-02";
import { DashboardPageSection3 } from "./view-section-03";
import { DashboardPageSection4 } from "./view-section-04";
import { DashboardPageSection5 } from "./view-section-05";
import { DashboardPageSection6 } from "./view-section-06";
import { DashboardPageSection7 } from "./view-section-07";
import { DashboardPageSection8 } from "./view-section-08";
import { DashboardPageSection9 } from "./view-section-09";
import { DashboardPageSection10 } from "./view-section-10";
import { DashboardPageSection11 } from "./view-section-11";
import { DashboardPageSection12 } from "./view-section-12";

export function DashboardPageSection1({ scope }: { scope: DashboardPageData }) {
  const { metrics, hasActivity } = scope;
  return (
    (
        <div className="space-y-8 pb-10 animate-in fade-in duration-700">
          <DashboardPageSection2 scope={scope} />
          
          <DashboardPageSection3 scope={scope} />
    
          <DashboardPageSection4 scope={scope} />
    
          <DashboardPageSection5 scope={scope} />
          <DashboardPageSection6 scope={scope} />
    
          <DashboardPageSection7 scope={scope} />
          <DashboardPageSection8 scope={scope} />
    
          <DashboardPageSection9 scope={scope} />
    
          <DashboardPageSection10 scope={scope} />
          <DashboardPageSection11 scope={scope} />
    
          <DashboardPageSection12 scope={scope} />
        </div>
      )
  );
}
