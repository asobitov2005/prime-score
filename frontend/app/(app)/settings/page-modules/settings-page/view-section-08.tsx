"use client";
import type { SettingsPageScope } from "./controller";
import { Button, Camera, Card, CardContent, CardDescription, CardHeader, CardTitle, Check, CreditCard, EmptyState, Globe, ImageOff, Input, Link, Loader2, Monitor, Pencil, Settings2, ShieldCheck, Smartphone, Trash2, User, X, cn } from "../dependencies";
import { SettingsPageSection2 } from "./view-section-08";

export function SettingsPageView1({ scope }: { scope: SettingsPageScope }) {
  const { avatarUrl, name, avatarInputRef, handleAvatarSelect, isSavingAvatar, handleRemoveAvatar, isEditing, setIsEditing, editName, setEditName, isSavingProfile, handleSave, handleCancel, phoneNumber, sessions, isSigningOutOthers, handleSignOutOthers, isLoadingSessions, resolveSessionMeta, currentSessionId, formatLastUsed, revokingId, handleRevokeSession, isPremium, subscriptionHref } = scope;
  return (
    (
        <div className="space-y-4 animate-in fade-in duration-500 pb-6">
          <SettingsPageSection2 scope={scope} />
        </div>
      )
  );
}
