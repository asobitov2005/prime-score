import { getAdminPromoCodes } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, SectionHeader, Select, Textarea, buttonClassName, formatDate } from "@/components/ui";

export default async function PromoCodesPage() {
  const promoCodes = await getAdminPromoCodes();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Revenue"
        title="Promo codes"
        description="Discount and gift-code management will later connect to subscription flows."
        actions={
          <button type="button" className={buttonClassName({ variant: "solid", size: "sm" })}>
            New code
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create code</CardTitle>
            <CardDescription>Create promo or gift code with explicit limits and expiry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Code</label>
              <Input placeholder="WELCOME20" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Discount</label>
                <Input placeholder="20%" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Max uses</label>
                <Input placeholder="100" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Valid until</label>
                <Input placeholder="2026-06-01" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Mode</label>
                <Select defaultValue="promo">
                  <option value="promo">Promo</option>
                  <option value="gift">Gift</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Applicable plans</label>
              <Textarea placeholder="All plans or select plan IDs later via backend state." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing codes</CardTitle>
            <CardDescription>Operational list of active, expired, and paused codes.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium">Code</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Discount</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Uses</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Valid until</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={5}>
                      No promo codes found.
                    </td>
                  </tr>
                ) : null}
                {promoCodes.map((code) => (
                  <tr key={code.id} className="align-top">
                    <td className="border-b border-border px-3 py-4 font-medium text-foreground">{code.code}</td>
                    <td className="border-b border-border px-3 py-4">
                      <Badge tone="info">{code.discount}</Badge>
                    </td>
                    <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{code.uses}</td>
                    <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{formatDate(code.validUntil)}</td>
                    <td className="border-b border-border px-3 py-4">
                      <Badge tone={code.status === "active" ? "success" : code.status === "expired" ? "warning" : "paused"}>{code.status}</Badge>
                    </td>
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
