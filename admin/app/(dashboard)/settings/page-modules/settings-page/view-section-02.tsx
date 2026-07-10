"use client";
import type { SettingsPageScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, SectionHeader, cn } from "../dependencies";
import { ActionRow, IntegrationRow, NotifCard, Stat } from "../shared";
import { SettingsPageSection2 } from "./view-section-02";

export function SettingsPageView1({ scope }: { scope: SettingsPageScope }) {
  const { actionMsg, settings, handleSecuritySubmit, adminPhone, updateAdminPhone, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, actionLoading, togglePaymentStatus, doAction, setShowBroadcast, downloadCSV, showBroadcast, handleBroadcastSubmit, bcTitle, setBcTitle, bcBody, setBcBody, bcTgText, setBcTgText } = scope;
  return (
    (
        <div className="space-y-6 max-w-4xl relative">
          <SectionHeader eyebrow="System" title="Settings" description="Manage integrations, notifications, and platform tools." />
    
          {actionMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{actionMsg}</div>
          )}
    
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Users" value={settings.total_users} />
            <Stat label="Tests" value={settings.total_tests} />
            <Stat label="Attempts" value={settings.total_attempts} />
          </div>
    
          {/* Admin Account */}
          <SettingsPageSection2 scope={scope} />
    
          {/* Integrations */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">Integrations</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border/30">
              <IntegrationRow
                emoji="🤖" title="Telegram Bot" desc="Login codes, notifications, announcements"
                status={settings.telegram_bot_connected} statusLabel={settings.telegram_bot_connected ? "Connected" : "Not configured"}
              />
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center text-lg", !settings.payment_paused ? "bg-emerald-500/10" : "bg-muted")}>💳</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Payment System</p>
                    <p className="text-[10px] text-muted-foreground">Click, Payme — online payments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={!settings.payment_paused ? "success" : "paused"} className="text-[10px] uppercase font-black tracking-widest">
                    {!settings.payment_paused ? "Active" : "Paused"}
                  </Badge>
                  <button 
                    onClick={togglePaymentStatus} 
                    disabled={actionLoading === "toggle_payment"}
                    className={cn("px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors",
                      settings.payment_paused ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                    )}
                  >
                    {settings.payment_paused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
              <IntegrationRow emoji="🗄️" title="PostgreSQL" desc="Primary database" status={true} statusLabel="Connected" />
              <IntegrationRow emoji="⚡" title="Redis" desc="Session store, code cache, rate limiting" status={true} statusLabel="Connected" />
            </CardContent>
          </Card>
    
          {/* Notification Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold">Notification Channels</CardTitle>
                <Badge tone="info" className="text-[10px] uppercase font-black tracking-widest">App + Telegram</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <NotifCard title="New Test Published" desc="All users — app & Telegram with Try Now button" active />
                <NotifCard title="Premium Gifted" desc="User — app & Telegram confirmation" active />
                <NotifCard title="Premium Revoked" desc="User — app & Telegram alert" active />
                <NotifCard title="Premium Expired" desc="Auto — user notified when subscription ends" active />
                <NotifCard title="Premium Expiring" desc="Auto — 3 days before expiry warning" active />
                <NotifCard title="Payment Success" desc="User — confirmation after payment" active={!settings.payment_paused} />
              </div>
            </CardContent>
          </Card>
    
          {/* Tools & Actions */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold">Tools</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border/30">
              <ActionRow
                title="Run Premium Expiry Check"
                desc="Scan all users — deactivate expired premiums, warn expiring ones, send notifications."
                btnLabel={actionLoading === "premium" ? "Running..." : "Run Now"}
                onClick={() => doAction("premium", "/check-premiums")}
                disabled={actionLoading !== null}
              />
              <ActionRow
                title="Broadcast Notification"
                desc="Send a custom notification to all users via app and Telegram."
                btnLabel="Open Broadcaster"
                onClick={() => setShowBroadcast(true)}
                disabled={actionLoading !== null}
              />
              <ActionRow
                title="Export Users CSV"
                desc="Download all user data as CSV for analytics or CRM import."
                btnLabel={actionLoading === "csv" ? "Exporting..." : "Download CSV"}
                onClick={downloadCSV}
                disabled={actionLoading !== null}
              />
              <ActionRow
                title="Sync Leaderboard"
                desc="Recalculate and refresh leaderboard rankings from attempt data."
                btnLabel={actionLoading === "leaderboard" ? "Syncing..." : "Sync Now"}
                onClick={() => doAction("leaderboard", "/sync-leaderboard")}
                disabled={actionLoading !== null}
              />
            </CardContent>
          </Card>
    
          {/* Danger Zone */}
          <Card className="border-red-500/20">
            <CardHeader><CardTitle className="text-sm font-bold text-red-500">Danger Zone</CardTitle></CardHeader>
            <CardContent className="divide-y divide-border/30">
              <ActionRow
                title="Force Logout All Users"
                desc="Invalidate all active sessions. Users must re-authenticate."
                btnLabel={actionLoading === "logout" ? "Clearing..." : "Clear All Sessions"}
                onClick={() => {
                  if(window.confirm("Are you sure you want to logout all users immediately?")) {
                    doAction("logout", "/clear-sessions");
                  }
                }}
                disabled={actionLoading !== null}
                danger
              />
              <ActionRow
                title="Purge Draft Tests"
                desc="Delete all tests in draft status that have no attempts."
                btnLabel={actionLoading === "purge" ? "Purging..." : "Purge Drafts"}
                onClick={() => {
                  if(window.confirm("Are you sure you want to permanently delete all draft tests with no attempts?")) {
                    doAction("purge", "/draft-tests", "DELETE");
                  }
                }}
                disabled={actionLoading !== null}
                danger
              />
            </CardContent>
          </Card>
    
          {/* Broadcast Modal */}
          {showBroadcast && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <CardHeader>
                  <CardTitle>Broadcast Notification</CardTitle>
                </CardHeader>
                <form onSubmit={handleBroadcastSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title</label>
                      <input required value={bcTitle} onChange={e => setBcTitle(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="E.g. Scheduled Maintenance" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">App Message Body</label>
                      <textarea required value={bcBody} onChange={e => setBcBody(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Message shown in the web app" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Telegram Text (Optional)</label>
                      <textarea value={bcTgText} onChange={e => setBcTgText(e.target.value)} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="HTML formatting allowed. Leaves empty to use Title + Body." />
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowBroadcast(false)} className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
                    <button type="submit" disabled={actionLoading === "broadcast"} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      {actionLoading === "broadcast" ? "Sending..." : "Send to All"}
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )
  );
}
