"use client";
import type { BaseScope } from "./base";
import { AdminPlanSummary, FormEvent, useEffect, useMemo, useState } from "../dependencies";
import { BackendPlanPayload, PlanFormState, buildDraft, formatMoney, mapBackendPlan, normalizePerkLines, parsePriceInput, requestPlanJson, sortPlans } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { initialPlans } = scope;
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

  return { plans, setPlans, draft, setDraft, saving, setSaving, submitError, setSubmitError, notice, setNotice, totalPlans, activePlans, featuredPlans, preview, openCreate, openEdit, closeModal, handleSave };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
