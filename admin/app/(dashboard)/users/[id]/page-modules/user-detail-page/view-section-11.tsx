"use client";
import type { UserDetailPageScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle } from "../dependencies";
import { InfoRow, daysLeft, fmt, fmtDate } from "../shared";

export function UserDetailPageSection11({ scope }: { scope: UserDetailPageScope }) {
  const { user, fullName, premiumExpired } = scope;
  return (
    <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold">Account ma&apos;lumotlari</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="ID" value={user.id} mono />
                <InfoRow label="Telegram ID" value={String(user.telegram_id)} mono />
                <InfoRow label="Ism" value={fullName} />
                <InfoRow label="Username" value={user.username ? `@${user.username}` : "—"} />
                <InfoRow label="Telefon" value={user.phone ?? "—"} />
                <InfoRow label="Ro'yxatdan o'tgan" value={fmt(user.created_at)} />
                <InfoRow label="Oxirgi faollik" value={fmt(user.last_active_at)} />
              </CardContent>
            </Card>
    
            <Card>
              <CardHeader><CardTitle className="text-sm font-bold">Subscription</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Status" value={user.is_premium && !premiumExpired ? "Premium" : premiumExpired ? "Expired" : "Free"} badge={user.is_premium && !premiumExpired ? "success" : premiumExpired ? "warning" : "neutral"} />
                <InfoRow label="Premium tugashi" value={user.premium_until ? `${fmtDate(user.premium_until)} ${daysLeft(user.premium_until)}` : "—"} />
                <InfoRow label="Leaderboard" value={user.show_on_leaderboard ? "Ko'rinadi" : "Yashirin"} badge={user.show_on_leaderboard ? "success" : "paused"} />
              </CardContent>
            </Card>
          </div>
  );
}
