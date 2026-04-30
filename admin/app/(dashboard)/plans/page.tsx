import { PlanManager } from "@/components/plans/plan-manager";
import { getAdminPlans } from "@/lib/server-data";

export default async function PlansPage() {
  const plans = await getAdminPlans();

  return <PlanManager initialPlans={plans} />;
}
