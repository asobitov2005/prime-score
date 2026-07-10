"use client";
import type { UsersPageScope } from "./controller";
import { AdminTableLoadingSkeleton, Badge, Card, CardContent, buttonClassName, cn, formatDate } from "../dependencies";

export function UsersPageSection3({ scope }: { scope: UsersPageScope }) {
  const { loading, allSelected, toggleAll, filtered, selectedIds, toggle } = scope;
  return (
    <Card>
            <CardContent className="overflow-x-auto p-0">
              {loading ? (
                <AdminTableLoadingSkeleton rows={7} columns={8} />
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.24em] text-muted-foreground bg-muted/30">
                      <th className="border-b border-border px-4 py-3 font-medium w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                      </th>
                      <th className="border-b border-border px-3 py-3 font-medium">User</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Attempts</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Band</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Premium</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Leaderboard</th>
                      <th className="border-b border-border px-3 py-3 font-medium">Last active</th>
                      <th className="border-b border-border px-3 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={8}>No users found.</td></tr>
                    ) : null}
                    {filtered.map((user) => (
                      <tr key={user.id} className={cn("align-top transition-colors", selectedIds.has(user.id) ? "bg-primary/5" : "hover:bg-muted/30")}>
                        <td className="border-b border-border/50 px-4 py-4">
                          <input type="checkbox" checked={selectedIds.has(user.id)} onChange={() => toggle(user.id)} className="accent-primary h-4 w-4 rounded cursor-pointer" />
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">
                              {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt={user.name || "User"} className="h-full w-full object-cover" />
                              ) : (
                                (user.name || user.username || "?").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{user.name || "Unnamed user"}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <span className="truncate">{user.username ? `@${user.username}` : user.phone ?? "—"}</span>
                                {user.botContactAt && !user.firstLoginAt && (
                                  <Badge tone="info" className="text-[9px] uppercase tracking-widest">Bot user</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4 text-sm font-semibold text-foreground">
                          {user.attempts}
                          {user.completed > 0 && <span className="text-muted-foreground font-normal"> / {user.completed} done</span>}
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <Badge tone="info" className="text-xs font-bold">{user.band}</Badge>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <Badge tone={user.premiumState === "active" ? "success" : user.premiumState === "expired" ? "warning" : "neutral"} className="text-[10px] uppercase font-black tracking-widest">
                            {user.premiumState}
                          </Badge>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <Badge tone={user.leaderboardVisible ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">
                            {user.leaderboardVisible ? "Visible" : "Hidden"}
                          </Badge>
                        </td>
                        <td className="border-b border-border/50 px-3 py-4 text-[11px] font-bold text-muted-foreground uppercase">{formatDate(user.lastActiveAt)}</td>
                        <td className="border-b border-border/50 px-3 py-4">
                          <a href={`/users/${user.id}`} className={buttonClassName({ variant: "outline", size: "sm" })}>View</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
  );
}
