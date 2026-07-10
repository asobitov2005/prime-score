"use client";
import type { UserDetailPageScope } from "./controller";
import { Badge, Card, CardContent } from "../dependencies";

export function UserDetailPageSection5({ scope }: { scope: UserDetailPageScope }) {
  const { user, fullName, premiumExpired } = scope;
  return (
    <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-2xl font-black text-primary">
                  {user.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar_url} alt={fullName || "User"} className="h-full w-full object-cover" />
                  ) : (
                    (fullName || user.username || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
                    {user.is_premium && !premiumExpired && <Badge tone="success" className="text-[10px] uppercase font-black tracking-widest">Premium</Badge>}
                    {premiumExpired && <Badge tone="warning" className="text-[10px] uppercase font-black tracking-widest">Premium expired</Badge>}
                    {!user.is_premium && !premiumExpired && <Badge tone="neutral" className="text-[10px] uppercase font-black tracking-widest">Free</Badge>}
                    {user.bot_contact_at && !user.first_login_at && <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">Bot user</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    {user.phone && <span>📱 {user.phone}</span>}
                    {user.username && <span>@{user.username}</span>}
                    <span>Telegram ID: {user.telegram_id}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
  );
}
