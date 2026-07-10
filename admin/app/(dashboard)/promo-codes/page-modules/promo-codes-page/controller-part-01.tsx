"use client";
import type { BaseScope } from "./base";
import { useEffect, useMemo, useState } from "../dependencies";
import { GiftCodeRow, PlanOption, formatDateTimeInputValue, normalizeCodeInput, normalizePrefix, requestAdmin, roundUpToMinuteStep } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const [plans, setPlans] = useState<PlanOption[]>([]);

  const [codes, setCodes] = useState<GiftCodeRow[]>([]);

  const [recentBatch, setRecentBatch] = useState<GiftCodeRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [rowActionId, setRowActionId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);

  const [toastPosition, setToastPosition] = useState({ x: 24, y: 24 });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [selectedPlanId, setSelectedPlanId] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [prefix, setPrefix] = useState("PRIME");

  const [customCode, setCustomCode] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [maxUses, setMaxUses] = useState("1");

  const [perUserLimit, setPerUserLimit] = useState("1");

  const [targetUserType, setTargetUserType] = useState<GiftCodeRow["target_user_type"]>("all");

  const [startsPaused, setStartsPaused] = useState(false);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<GiftCodeRow["status"] | "all">("all");

  const [planFilter, setPlanFilter] = useState<string>("all");

  const quantityNumber = Math.min(50, Math.max(1, Number.parseInt(quantity || "1", 10) || 1));

  const maxUsesNumber = Math.min(5000, Math.max(1, Number.parseInt(maxUses || "1", 10) || 1));

  const perUserLimitNumber = Math.min(maxUsesNumber, Math.max(1, Number.parseInt(perUserLimit || "1", 10) || 1));

  const normalizedPrefix = normalizePrefix(prefix);

  const currentDateTimeInputValue = useMemo(() => formatDateTimeInputValue(roundUpToMinuteStep(new Date())), []);

  const activePlans = useMemo(
      () => plans.filter((plan) => plan.is_active !== false),
      [plans],
    );

  const selectedPlan = useMemo(
      () => activePlans.find((plan) => plan.id === selectedPlanId) ?? null,
      [activePlans, selectedPlanId],
    );

  const loadPage = async (mode: "initial" | "refresh" = "initial") => {
      setError(null);
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
  
      try {
        const [planPayload, codePayload] = await Promise.all([
          requestAdmin<PlanOption[]>("/gift-code-plans"),
          requestAdmin<GiftCodeRow[]>("/gift-codes"),
        ]);
        const nextActivePlans = planPayload.filter((plan) => plan.is_active !== false);
        setPlans(planPayload);
        setCodes(codePayload);
        setSelectedPlanId((current) => (
          nextActivePlans.some((plan) => plan.id === current)
            ? current
            : nextActivePlans[0]?.id || ""
        ));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load redeem code workspace.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  useEffect(() => {
      void loadPage();
    }, []);

  useEffect(() => {
      if (!isCreateModalOpen) {
        return;
      }
  
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
  
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !submitting) {
          setIsCreateModalOpen(false);
        }
      };
  
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [isCreateModalOpen, submitting]);

  useEffect(() => {
      if (!message) {
        setToastVisible(false);
        return;
      }
  
      setToastVisible(true);
  
      const fadeTimer = window.setTimeout(() => {
        setToastVisible(false);
      }, 1800);
  
      const clearTimer = window.setTimeout(() => {
        setMessage(null);
      }, 2200);
  
      return () => {
        window.clearTimeout(fadeTimer);
        window.clearTimeout(clearTimer);
      };
    }, [message]);

  const filteredCodes = useMemo(() => {
      const normalizedSearch = search.trim().toLowerCase();
      return codes.filter((code) => {
        if (statusFilter !== "all" && code.status !== statusFilter) {
          return false;
        }
        if (planFilter !== "all" && code.plan_id !== planFilter) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        return [
          code.code,
          code.plan_name,
          code.recipient_name ?? "",
          code.recipient_username ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      });
    }, [codes, planFilter, search, statusFilter]);

  const metrics = useMemo(() => {
      const available = codes.filter((code) => code.status === "available").length;
      const redeemed = codes.filter((code) => code.status === "redeemed").length;
      const paused = codes.filter((code) => code.status === "paused").length;
      const expiringSoon = codes.filter((code) => {
        if (!code.end_date || code.status === "redeemed" || code.status === "revoked") {
          return false;
        }
        const expiresAtTime = new Date(code.end_date).getTime();
        const diff = expiresAtTime - Date.now();
        return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
      }).length;
      return { available, redeemed, paused, expiringSoon };
    }, [codes]);

  const previewCode = useMemo(() => {
      if (quantityNumber === 1 && customCode.trim()) {
        return normalizeCodeInput(customCode.trim()) || "CUSTOM-CODE";
      }
      return normalizedPrefix ? `${normalizedPrefix}-AB12-Q7ZX` : "AB12-Q7ZX";
    }, [customCode, normalizedPrefix, quantityNumber]);

  const effectiveStartDate = startDate || currentDateTimeInputValue;

  const syncUpdatedCode = (updated: GiftCodeRow) => {
      setCodes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setRecentBatch((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    };

  return { plans, setPlans, codes, setCodes, recentBatch, setRecentBatch, loading, setLoading, refreshing, setRefreshing, submitting, setSubmitting, rowActionId, setRowActionId, error, setError, message, setMessage, toastVisible, setToastVisible, toastPosition, setToastPosition, isCreateModalOpen, setIsCreateModalOpen, selectedPlanId, setSelectedPlanId, quantity, setQuantity, prefix, setPrefix, customCode, setCustomCode, startDate, setStartDate, endDate, setEndDate, maxUses, setMaxUses, perUserLimit, setPerUserLimit, targetUserType, setTargetUserType, startsPaused, setStartsPaused, search, setSearch, statusFilter, setStatusFilter, planFilter, setPlanFilter, quantityNumber, maxUsesNumber, perUserLimitNumber, normalizedPrefix, currentDateTimeInputValue, activePlans, selectedPlan, loadPage, filteredCodes, metrics, previewCode, effectiveStartDate, syncUpdatedCode };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
