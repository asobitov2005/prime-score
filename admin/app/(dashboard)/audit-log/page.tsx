import { getAdminAuditEntries } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, SectionHeader, Select, formatDate } from "@/components/ui";

export default async function AuditLogPage() {
  const entries = await getAdminAuditEntries();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Governance"
        title="Audit log"
        description="All admin actions are tracked here for traceability and incident review."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Quick views for actor, resource, and time range.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Actions</label>
            <Select defaultValue="all">
              <option value="all">All actions</option>
              <option value="publish">Publish</option>
              <option value="update">Update</option>
              <option value="logout">Logout</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Actors</label>
            <Select defaultValue="all">
              <option value="all">All actors</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Time Range</label>
            <Select defaultValue="all">
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Search Resource</label>
            <Input placeholder="Search resource..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Immutable list of high-signal administrative actions.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">Actor</th>
                <th className="border-b border-border px-3 py-3 font-medium">Action</th>
                <th className="border-b border-border px-3 py-3 font-medium">Resource</th>
                <th className="border-b border-border px-3 py-3 font-medium">Meta</th>
                <th className="border-b border-border px-3 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={5}>
                    No audit events found.
                  </td>
                </tr>
              ) : null}
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={entry.actor === "super_admin" ? "info" : "neutral"}>{entry.actor}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{entry.action}</td>
                  <td className="border-b border-border px-3 py-4 font-medium text-foreground">{entry.resource}</td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{entry.meta}</td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
