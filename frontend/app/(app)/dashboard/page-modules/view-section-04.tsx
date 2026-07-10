import type { DashboardPageData } from "./loader";
import { WelcomeHeader } from "./dependencies";

export function DashboardPageSection4({ scope }: { scope: DashboardPageData }) {
  const { analytics } = scope;
  return (
    <div>
              <WelcomeHeader analytics={analytics} />
            </div>
  );
}
