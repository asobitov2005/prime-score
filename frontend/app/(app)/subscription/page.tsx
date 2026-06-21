import { SubscriptionWorkspace } from "@/components/subscription/subscription-workspace";
import { getMyGiftCodeSummary } from "@/lib/server-gift-codes";
import { getMyPayments } from "@/lib/server-payments";
import { getPublicPlans } from "@/lib/server-plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SubscriptionPage() {
  const [plans, payments, giftSummary] = await Promise.all([getPublicPlans(), getMyPayments(), getMyGiftCodeSummary()]);

  return (
    <div className="-mt-1 animate-in fade-in duration-500 md:-mt-2">
      <SubscriptionWorkspace plans={plans} initialPayments={payments} initialGiftSummary={giftSummary} />
    </div>
  );
}
