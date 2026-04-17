import { getAdminUsers } from "@/lib/server-data";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select, SectionHeader, buttonClassName, formatDate } from "@/components/ui";

export default async function UsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="People"
        title="Users"
        description="Search users, inspect sessions, grant premium, and force logout when required."
        actions={
          <>
            <button type="button" className={buttonClassName({ variant: "outline", size: "sm" })}>
              Export
            </button>
            <button type="button" className={buttonClassName({ variant: "solid", size: "sm" })}>
              Grant premium
            </button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter users by premium status, visibility, and activity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Premium Status</label>
            <Select defaultValue="all">
              <option value="all">All users</option>
              <option value="active">Premium active</option>
              <option value="expired">Premium expired</option>
              <option value="free">Free</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Leaderboard</label>
            <Select defaultValue="all">
              <option value="all">Visibility (all)</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Activity Range</label>
            <Select defaultValue="all">
              <option value="all">All activity</option>
              <option value="recent">Recently active</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Search</label>
            <Input placeholder="Search name, email..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>User directory</CardTitle>
              <CardDescription>Session management and moderation actions will be wired to backend permissions.</CardDescription>
            </div>
            <Badge tone="neutral">Admin read access</Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <th className="border-b border-border px-3 py-3 font-medium">User</th>
                <th className="border-b border-border px-3 py-3 font-medium">Attempts</th>
                <th className="border-b border-border px-3 py-3 font-medium">Band</th>
                <th className="border-b border-border px-3 py-3 font-medium">Premium</th>
                <th className="border-b border-border px-3 py-3 font-medium">Leaderboard</th>
                <th className="border-b border-border px-3 py-3 font-medium">Last active</th>
                <th className="border-b border-border px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={7}>
                    No users found.
                  </td>
                </tr>
              ) : null}
              {users.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="border-b border-border px-3 py-4">
                    <div className="font-medium text-foreground">{user.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{user.attempts}</td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone="info">{user.band}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={user.premiumState === "active" ? "success" : user.premiumState === "expired" ? "warning" : "neutral"}>{user.premiumState}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4">
                    <Badge tone={user.leaderboardVisible ? "success" : "paused"}>{user.leaderboardVisible ? "Visible" : "Hidden"}</Badge>
                  </td>
                  <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">{formatDate(user.lastActiveAt)}</td>
                  <td className="border-b border-border px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={buttonClassName({ variant: "outline", size: "sm" })}>
                        View
                      </button>
                      <button type="button" className={buttonClassName({ variant: "ghost", size: "sm" })}>
                        Sessions
                      </button>
                      <button type="button" className={buttonClassName({ variant: "ghost", size: "sm" })}>
                        Force logout
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
