"use client";
import type { BaseScope } from "./base";
import { AdminSettingsLoadingSkeleton, getClientAdminAccessToken, useEffect, useState } from "../dependencies";
import { API_BASE, Settings, toLocalPhone } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);

  const [actionMsg, setActionMsg] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Broadcast dialog state
    const [showBroadcast, setShowBroadcast] = useState(false);

  const [bcTitle, setBcTitle] = useState("");

  const [bcBody, setBcBody] = useState("");

  const [bcTgText, setBcTgText] = useState("");

  const [adminPhone, setAdminPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const token = () => getClientAdminAccessToken();

  const updateAdminPhone = (value: string) => setAdminPhone(value.replace(/\D/g, "").slice(0, 9));

  const fetchSettings = () => {
      const t = token();
      if (!t) { setLoading(false); return; }
      fetch(`${API_BASE}/settings`, { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((nextSettings: Settings) => {
          setSettings(nextSettings);
          setAdminPhone(toLocalPhone(nextSettings.admin_phone_number));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

  useEffect(() => { fetchSettings(); }, []);

  const doAction = async (key: string, url: string, method = "POST", payload?: any) => {
      setActionLoading(key); setActionMsg("");
      try {
        const res = await fetch(`${API_BASE}${url}`, { 
          method, 
          headers: { 
            Authorization: `Bearer ${token()}`,
            ...(payload ? { "Content-Type": "application/json" } : {})
          },
          body: payload ? JSON.stringify(payload) : undefined
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setActionMsg(data.message ?? "Done.");
        fetchSettings();
      } catch { setActionMsg("Action failed."); }
      finally { setActionLoading(null); }
    };

  const downloadCSV = async () => {
      setActionLoading("csv"); setActionMsg("");
      try {
        const res = await fetch(`${API_BASE}/export-users-csv`, { headers: { Authorization: `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "users_export.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setActionMsg("CSV downloaded successfully.");
      } catch { setActionMsg("Failed to download CSV."); }
      finally { setActionLoading(null); }
    };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!bcTitle || !bcBody) return;
      await doAction("broadcast", "/broadcast-notification", "POST", {
        title: bcTitle,
        body: bcBody,
        telegram_text: bcTgText || null,
      });
      setShowBroadcast(false);
      setBcTitle(""); setBcBody(""); setBcTgText("");
    };

  const togglePaymentStatus = async () => {
      if (!settings) return;
      await doAction("toggle_payment", "/settings", "PATCH", {
        payment_paused: !settings.payment_paused
      });
    };

  const handleSecuritySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!settings) return;
  
      const currentPhone = toLocalPhone(settings.admin_phone_number);
      const phoneChanged = adminPhone !== currentPhone;
      const passwordChanged = newPassword.length > 0;
  
      if (!phoneChanged && !passwordChanged) {
        setActionMsg("Nothing to update.");
        return;
      }
      if (adminPhone.length !== 9) {
        setActionMsg("Phone number must be 9 digits.");
        return;
      }
      if (!currentPassword) {
        setActionMsg("Current password is required.");
        return;
      }
      if (passwordChanged && newPassword.length < 8) {
        setActionMsg("New password must be at least 8 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setActionMsg("New password confirmation does not match.");
        return;
      }
  
      setActionLoading("security");
      setActionMsg("");
      try {
        const res = await fetch(`${API_BASE}/auth/security`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: currentPassword,
            phone_number: phoneChanged ? adminPhone : null,
            new_password: passwordChanged ? newPassword : null,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.detail ?? "Admin account update failed.");
        }
        const payload = await res.json();
        setActionMsg(payload.message ?? "Admin account updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchSettings();
      } catch (error) {
        setActionMsg(error instanceof Error ? error.message : "Admin account update failed.");
      } finally {
        setActionLoading(null);
      }
    };

  if (loading) return <AdminSettingsLoadingSkeleton />;

  if (!settings) return <div className="text-sm text-muted-foreground">Failed to load settings.</div>;

  return { settings, setSettings, loading, setLoading, actionMsg, setActionMsg, actionLoading, setActionLoading, showBroadcast, setShowBroadcast, bcTitle, setBcTitle, bcBody, setBcBody, bcTgText, setBcTgText, adminPhone, setAdminPhone, currentPassword, setCurrentPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, token, updateAdminPhone, fetchSettings, doAction, downloadCSV, handleBroadcastSubmit, togglePaymentStatus, handleSecuritySubmit };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
