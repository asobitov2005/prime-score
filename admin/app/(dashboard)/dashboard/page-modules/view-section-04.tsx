import type { DashboardPageData } from "./loader";
import { Activity, CreditCard, PrimePremiumIcon, Users } from "./dependencies";
import { MetricCard, formatMoney, formatNumber } from "./shared";

export function DashboardPageSection4({ scope }: { scope: DashboardPageData }) {
  const { metrics } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Revenue"
              value={`${formatMoney(metrics.revenueTotal)} UZS`}
              detail={`${formatNumber(metrics.paymentsCompleted)} completed payments`}
              icon={<CreditCard className="h-5 w-5" />}
              tone="success"
            />
            <MetricCard
              label="Users"
              value={formatNumber(metrics.usersTotal)}
              detail={`${formatNumber(metrics.usersNewToday)} new today, ${formatNumber(metrics.activeUsers7d)} active in 7 days`}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="Attempts"
              value={formatNumber(metrics.attemptsTotal)}
              detail={`${formatNumber(metrics.attemptsToday)} started today, ${metrics.completionRate}% completed`}
              icon={<Activity className="h-5 w-5" />}
              tone="warning"
            />
            <MetricCard
              label="Premium"
              value={formatNumber(metrics.premiumUsers)}
              detail={`${metrics.premiumRate}% of registered users`}
              icon={<PrimePremiumIcon className="h-5 w-5" />}
              tone="success"
            />
          </div>
  );
}
