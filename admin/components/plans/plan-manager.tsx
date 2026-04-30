"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Crown, Eye, EyeOff, Pencil, Plus, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice, SectionHeader, Select, Textarea, cn } from "@/components/ui";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import type { AdminPlanSummary } from "@/lib/types";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

type PlanManagerProps = {
  initialPlans: AdminPlanSummary[];
};

type BackendPlanPayload = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  badge_label?: string | null;
  perks?: string[];
  display_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
};

type PlanFormState = {
  id: string | null;
  name: string;
  durationDays: string;
  price: string;
  badgeLabel: string;
  perksText: string;
  displayOrder: string;
  isActive: boolean;
  isFeatured: boolean;
};

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} sum`;
}

function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapBackendPlan(payload: BackendPlanPayload): AdminPlanSummary {
  return {
    id: payload.id,
    name: payload.name,
    durationDays: payload.duration_days,
    price: toNumber(payload.price),
    badgeLabel: (payload.badge_label ?? "").trim(),
    perks: Array.isArray(payload.perks) ? payload.perks.map((item) => String(item ?? "").trim()).filter(Boolean) : [],
    displayOrder: payload.display_order ?? 0,
    isActive: payload.is_active !== false,
    isFeatured: payload.is_featured === true,
  };
}

function sortPlans(items: AdminPlanSummary[]): AdminPlanSummary[] {
  return [...items].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    if (left.durationDays !== right.durationDays) {
      return left.durationDays - right.durationDays;
    }
    return left.price - right.price;
  });
}

function normalizePerkLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.replace(/^[\s\-•]+/, "").trim())
    .filter(Boolean);
}

function parsePriceInput(value: string): number {
  const numeric = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildDraft(plan: AdminPlanSummary | null, existingPlans: AdminPlanSummary[]): PlanFormState {
  if (plan) {
    return {
      id: plan.id,
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(Math.round(plan.price)),
      badgeLabel: plan.badgeLabel,
      perksText: plan.perks.join("\n"),
      displayOrder: String(plan.displayOrder),
      isActive: plan.isActive,
      isFeatured: plan.isFeatured,
    };
  }

  const nextOrder = existingPlans.reduce((highest, item) => Math.max(highest, item.displayOrder), 0) + 10;
  return {
    id: null,
    name: "",
    durationDays: "30",
    price: "",
    badgeLabel: "Premium Plan",
    perksText: "",
    displayOrder: String(nextOrder),
    isActive: true,
    isFeatured: false,
  };
}

async function requestPlanJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getClientAdminAccessToken();
  if (!token) {
    throw new Error("Admin session is missing.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.detail === "string" ? payload.detail : "Request failed.");
  }

  return (await response.json()) as T;
}

export function PlanManager({ initialPlans }: PlanManagerProps) {
  const [plans, setPlans] = useState<AdminPlanSummary[]>(() => sortPlans(initialPlans));
  const [draft, setDraft] = useState<PlanFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  useEffect(() => {
    setPlans(sortPlans(initialPlans));
  }, [initialPlans]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!draft) {
      return undefined;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setDraft(null);
        setSubmitError(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [draft, saving]);

  const totalPlans = plans.length;
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const featuredPlans = plans.filter((plan) => plan.isFeatured).length;

  const preview = useMemo(() => {
    if (!draft) {
      return null;
    }

    const durationDays = Number(draft.durationDays);
    const price = parsePriceInput(draft.price);
    const monthlyCost = durationDays > 0 ? (price / durationDays) * 30 : price;
    return {
      durationDays,
      price,
      monthlyLabel: `Approx. ${formatMoney(monthlyCost)} / 30 days`,
      perks: normalizePerkLines(draft.perksText),
    };
  }, [draft]);

  const openCreate = () => {
    setSubmitError(null);
    setDraft(buildDraft(null, plans));
  };

  const openEdit = (plan: AdminPlanSummary) => {
    setSubmitError(null);
    setDraft(buildDraft(plan, plans));
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setDraft(null);
    setSubmitError(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    const name = draft.name.trim();
    const durationDays = Number(draft.durationDays);
    const price = parsePriceInput(draft.price);
    const displayOrder = Number(draft.displayOrder);
    const perks = normalizePerkLines(draft.perksText);

    if (!name) {
      setSubmitError("Plan name is required.");
      return;
    }
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      setSubmitError("Duration must be a valid number of days.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setSubmitError("Price must be greater than zero.");
      return;
    }
    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      setSubmitError("Sort order must be zero or higher.");
      return;
    }
    if (perks.length === 0) {
      setSubmitError("Add at least one plan perk.");
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const payload = {
        name,
        duration_days: durationDays,
        price,
        badge_label: draft.badgeLabel.trim() || null,
        perks,
        is_active: draft.isActive,
        display_order: displayOrder,
        is_featured: draft.isFeatured,
      };

      const saved = await requestPlanJson<BackendPlanPayload>(
        draft.id ? `/plans/${draft.id}` : "/plans",
        {
          method: draft.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      const nextPlan = mapBackendPlan(saved);
      setPlans((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextPlan.id);
        return sortPlans([...withoutCurrent, nextPlan]);
      });
      setDraft(null);
      setNotice({ tone: "success", text: "Plan saved." });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Plan could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Catalog"
        title="Subscription plans"
        description="These plans feed the landing page, /pricing, and the user subscription page directly from the database."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create plan
          </Button>
        }
      />

      {notice ? (
        <Notice
          tone={notice.tone}
          title={notice.tone === "success" ? "Saved" : "Check required fields"}
          description={notice.text}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total plans</CardDescription>
            <CardTitle className="text-2xl">{totalPlans}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Visible on pricing</CardDescription>
            <CardTitle className="text-2xl">{activePlans}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Featured cards</CardDescription>
            <CardTitle className="text-2xl">{featuredPlans}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm font-medium text-muted-foreground">
            No subscription plans are configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => {
            const monthlyCost = plan.durationDays > 0 ? (plan.price / plan.durationDays) * 30 : plan.price;
            const previewPerks = plan.perks.slice(0, 4);
            const hiddenPerks = Math.max(0, plan.perks.length - previewPerks.length);

            return (
              <Card key={plan.id} className={cn(
                "overflow-hidden border-border/60",
                plan.isFeatured && "border-primary/30 shadow-[0_16px_40px_-24px_rgba(217,75,4,0.45)]",
              )}>
                <CardHeader className="space-y-4 border-b border-border/40 bg-muted/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {plan.badgeLabel ? (
                          <Badge tone={plan.isFeatured ? "info" : "neutral"}>{plan.badgeLabel}</Badge>
                        ) : null}
                        <Badge tone={plan.isActive ? "success" : "warning"}>
                          {plan.isActive ? "Live" : "Hidden"}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                        <CardDescription>{plan.durationDays} days • Order {plan.displayOrder}</CardDescription>
                      </div>
                    </div>

                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl border shadow-inner",
                      plan.isFeatured
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}>
                      {plan.isFeatured ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">{formatMoney(plan.price)}</p>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Approx. {formatMoney(monthlyCost)} / 30 days
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-6">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {previewPerks.map((perk) => (
                      <li key={perk} className="leading-relaxed">
                        {perk}
                      </li>
                    ))}
                    {hiddenPerks > 0 ? (
                      <li className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                        +{hiddenPerks} more
                      </li>
                    ) : null}
                  </ul>

                  <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {plan.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {plan.isActive ? "Visible on user pricing" : "Hidden from user pricing"}
                    </div>

                    <Button type="button" variant="outline" onClick={() => openEdit(plan)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">
                  {draft.id ? "Edit plan" : "Create plan"}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {draft.id ? "Update pricing card" : "Add a new pricing card"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Name, price, badge, perks, and order all publish from here to the user pricing surfaces.
                </p>
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form className="space-y-6 p-6" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan name</Label>
                  <Input
                    id="plan-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)}
                    placeholder="1 Month"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-badge">Badge label</Label>
                  <Input
                    id="plan-badge"
                    value={draft.badgeLabel}
                    onChange={(event) => setDraft((current) => current ? { ...current, badgeLabel: event.target.value } : current)}
                    placeholder="Most Popular"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-duration">Duration (days)</Label>
                  <Input
                    id="plan-duration"
                    type="number"
                    min={1}
                    value={draft.durationDays}
                    onChange={(event) => setDraft((current) => current ? { ...current, durationDays: event.target.value } : current)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-price">Price (UZS)</Label>
                  <Input
                    id="plan-price"
                    inputMode="numeric"
                    value={draft.price}
                    onChange={(event) => setDraft((current) => current ? { ...current, price: event.target.value } : current)}
                    placeholder="59000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan-order">Sort order</Label>
                  <Input
                    id="plan-order"
                    type="number"
                    min={0}
                    value={draft.displayOrder}
                    onChange={(event) => setDraft((current) => current ? { ...current, displayOrder: event.target.value } : current)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plan-visibility">Visibility</Label>
                    <Select
                      id="plan-visibility"
                      value={draft.isActive ? "live" : "hidden"}
                      onChange={(event) => setDraft((current) => current ? { ...current, isActive: event.target.value === "live" } : current)}
                    >
                      <option value="live">Live</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-featured">Featured style</Label>
                    <Select
                      id="plan-featured"
                      value={draft.isFeatured ? "featured" : "standard"}
                      onChange={(event) => setDraft((current) => current ? { ...current, isFeatured: event.target.value === "featured" } : current)}
                    >
                      <option value="standard">Standard</option>
                      <option value="featured">Featured</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-perks">Plan perks</Label>
                <Textarea
                  id="plan-perks"
                  className="min-h-[180px]"
                  value={draft.perksText}
                  onChange={(event) => setDraft((current) => current ? { ...current, perksText: event.target.value } : current)}
                  placeholder={"Full access to all IELTS mock tests\nDetailed test analysis after each test"}
                />
                <p className="text-xs font-medium text-muted-foreground">
                  One perk per line. These lines render directly under the plan price on the user-facing cards.
                </p>
              </div>

              <Card className="border-dashed border-border/70 bg-muted/10">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      {draft.badgeLabel.trim() ? (
                        <Badge tone={draft.isFeatured ? "info" : "neutral"}>{draft.badgeLabel.trim()}</Badge>
                      ) : null}
                      <CardTitle className="text-lg">{draft.name.trim() || "Plan preview"}</CardTitle>
                    </div>
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl border shadow-inner",
                      draft.isFeatured
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}>
                      {draft.isFeatured ? <Crown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-semibold text-foreground">
                      {preview && preview.price > 0 ? formatMoney(preview.price) : "Price preview"}
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {preview && preview.durationDays > 0 ? preview.monthlyLabel : "Approx. monthly view will appear here"}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(preview?.perks ?? []).length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {preview?.perks.slice(0, 4).map((perk) => (
                        <li key={perk}>{perk}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Add perks to preview the list here.</p>
                  )}
                </CardContent>
              </Card>

              {submitError ? (
                <Notice tone="warning" title="Could not save plan" description={submitError} />
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : draft.id ? "Save changes" : "Create plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
