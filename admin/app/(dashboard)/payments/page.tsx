import { getAdminPayments } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice, SectionHeader, buttonClassName } from "@/components/ui";

export default async function PaymentsPage() {
  const payments = await getAdminPayments();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Revenue ops"
        title="Payments"
        description="Provider readiness, pending charges, and webhook surfaces are visible here even while payment processing is paused."
        actions={
          <button type="button" className={buttonClassName({ variant: "outline", size: "sm" })}>
            Refresh
          </button>
        }
      />

      <Notice
        tone="paused"
        title="Payment ingestion"
        description="Recent records are shown only when backend connectors are configured."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Provider readiness</CardTitle>
            <CardDescription>The next activation step will connect webhooks and verification callbacks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Payme", "Paused"],
              ["Click", "Paused"],
              ["Uzum", "Paused"],
              ["Manual", "Ready"]
            ].map(([name, state]) => (
              <div key={name} className="flex items-center justify-between rounded-md border border-border bg-muted px-4 py-3">
                <span className="text-sm font-medium text-foreground">{name}</span>
                <Badge tone={state === "Ready" ? "success" : "paused"}>{state}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent payment records</CardTitle>
            <CardDescription>Operational visibility without active provider coupling.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium">User</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Plan</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Method</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={5}>
                      No payment records found.
                    </td>
                  </tr>
                ) : null}
                {payments.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{payment.user}</td>
                    <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{payment.plan}</td>
                    <td className="border-b border-border px-3 py-4">
                      <Badge tone="neutral">{payment.method}</Badge>
                    </td>
                    <td className="border-b border-border px-3 py-4">
                      <Badge tone={payment.status === "completed" ? "success" : payment.status === "pending" ? "warning" : payment.status === "failed" ? "danger" : "neutral"}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{payment.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
