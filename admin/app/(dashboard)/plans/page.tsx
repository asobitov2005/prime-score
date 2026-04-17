import { getAdminPlans } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, SectionHeader, buttonClassName, formatCurrency } from "@/components/ui";

export default async function PlansPage() {
  const plans = await getAdminPlans();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Revenue"
        title="Subscription plans"
        description="Plan configuration remains editable, while checkout activation stays paused until payment work resumes."
        actions={
          <button type="button" className={buttonClassName({ variant: "solid", size: "sm" })}>
            New plan
          </button>
        }
      />

      <Notice
        tone="paused"
        title="Payment lifecycle controlled by backend"
        description="Plan availability and charges follow backend payment configuration."
      />

      <Card>
        <CardHeader>
          <CardTitle>Plan table</CardTitle>
          <CardDescription>Admin-configured durations, prices, discounts, and active states.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Plan</th>
                <th className="border-b border-border px-3 py-3 font-medium">Duration</th>
                <th className="border-b border-border px-3 py-3 font-medium">Price</th>
                <th className="border-b border-border px-3 py-3 font-medium">Discount</th>
                <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                <th className="border-b border-border px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={6}>
                    No subscription plans found.
                  </td>
                </tr>
              ) : null}
              {plans.map((plan) => (
                <tr key={plan.id} className="align-top">
                  <td className="border-b border-border px-3 py-4">
                    <div className="font-medium text-foreground">{plan.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Auto-renew is disabled.</div>
                  </td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{plan.durationDays} days</td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{formatCurrency(Number(plan.price.replace(/[^\d]/g, "")))}</td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone="info">{plan.discount}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={plan.status === "active" ? "success" : "warning"}>{plan.status}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={buttonClassName({ variant: "outline", size: "sm" })}>
                        Edit
                      </button>
                      <button type="button" className={buttonClassName({ variant: "ghost", size: "sm" })}>
                        Duplicate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
