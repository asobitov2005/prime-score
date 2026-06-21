"use client";

import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Gift,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice, SectionHeader, Select, cn } from "@/components/ui";
import { AdminMetricsTableLoadingSkeleton } from "@/components/loading-skeletons";
import { getClientAdminAccessToken } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

type PlanOption = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  discount_percent: number;
  is_active: boolean;
};

type GiftCodeRow = {
  id: string;
  code: string;
  plan_id: string | null;
  plan_name: string;
  duration_days: number | null;
  status: "available" | "paused" | "redeemed" | "revoked" | "expired";
  raw_status: string;
  start_date: string | null;
  end_date: string | null;
  max_uses: number;
  used_count: number;
  remaining_uses: number | null;
  per_user_limit: number;
  target_user_type: "all" | "premium" | "free";
  redeemed_at: string | null;
  created_at: string | null;
  recipient_user_id: string | null;
  recipient_name: string | null;
  recipient_username: string | null;
};

type CreateGiftCodesResponse = {
  message: string;
  items: GiftCodeRow[];
};

function formatDateTime(value: string | null, fallback = "No date"): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return `${value} UZS`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numeric) + " UZS";
}

function formatDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeInputValue(value: string): Date | null {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function getDateInputPart(value: string): string {
  return value.split("T")[0] ?? "";
}

function getTimeInputPart(value: string): string {
  const timePart = value.split("T")[1];
  return timePart ? timePart.slice(0, 5) : "";
}

function setDateInputPart(value: string, nextDatePart: string): string {
  if (!nextDatePart) {
    return "";
  }

  return `${nextDatePart}T${getTimeInputPart(value) || "00:00"}`;
}

function setTimeInputPart(value: string, nextTimePart: string): string {
  const currentDatePart = getDateInputPart(value);
  if (!currentDatePart) {
    return "";
  }

  return `${currentDatePart}T${nextTimePart || "00:00"}`;
}

function clampTimeInputPart(timePart: string, minTimePart?: string): string {
  if (!timePart) {
    return minTimePart ?? "00:00";
  }

  if (!minTimePart) {
    return timePart;
  }

  return timePart < minTimePart ? minTimePart : timePart;
}

function roundUpToMinuteStep(date: Date, minuteStep = 5): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);

  const remainder = next.getMinutes() % minuteStep;
  if (remainder !== 0 || next.getTime() <= date.getTime()) {
    next.setMinutes(next.getMinutes() + (remainder === 0 ? minuteStep : minuteStep - remainder));
  }

  return next;
}

function addMinutesToDateTimeInputValue(baseValue: string, minutes: number): string {
  const baseDate = parseDateTimeInputValue(baseValue) ?? roundUpToMinuteStep(new Date());
  const nextDate = new Date(baseDate);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return formatDateTimeInputValue(nextDate);
}

function addDaysToDateTimeInputValue(baseValue: string, days: number): string {
  const baseDate = parseDateTimeInputValue(baseValue) ?? roundUpToMinuteStep(new Date());
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return formatDateTimeInputValue(nextDate);
}

function formatDateTimeEntryLabel(value: string): string {
  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatDateOnlyInputValue(date: Date): string {
  return formatDateTimeInputValue(date).split("T")[0] ?? "";
}

function formatDateTimeButtonLabel(value: string): string {
  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfCalendarWeek(date: Date): Date {
  const next = new Date(date);
  const weekday = next.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function isBeforeDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getMonthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function buildCalendarDays(month: Date): Array<{ date: Date; inCurrentMonth: boolean }> {
  const monthStart = startOfMonth(month);
  const gridStart = startOfCalendarWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    return {
      date: cellDate,
      inCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
    };
  });
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DateTimePickerFieldProps = {
  value: string;
  onChange: (nextValue: string) => void;
  minValue?: string;
  placeholder: string;
};

function DateTimePickerField({ value, onChange, minValue, placeholder }: DateTimePickerFieldProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? parseDateTimeInputValue(value) : null;
  const minDate = minValue ? parseDateTimeInputValue(minValue) : null;
  const minDatePart = minValue ? getDateInputPart(minValue) : "";
  const selectedDatePart = value ? getDateInputPart(value) : "";
  const selectedTimePart = value ? getTimeInputPart(value) : "";
  const timeMin = selectedDatePart && minDatePart && selectedDatePart === minDatePart
    ? getTimeInputPart(minValue ?? "")
    : undefined;
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(selectedDate ?? minDate ?? new Date()));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setVisibleMonth(startOfMonth(selectedDate ?? minDate ?? new Date()));
  }, [isOpen, minDate, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const canMovePrev = !minDate || getMonthIndex(addMonths(visibleMonth, -1)) >= getMonthIndex(startOfMonth(minDate));

  const handleDateSelect = (date: Date) => {
    const nextDatePart = formatDateOnlyInputValue(date);
    const nextMinTime = minDatePart === nextDatePart ? getTimeInputPart(minValue ?? "") : undefined;
    const nextTimePart = clampTimeInputPart(selectedTimePart || nextMinTime || "09:00", nextMinTime);
    onChange(`${nextDatePart}T${nextTimePart}`);
  };

  const handleTimeSelect = (nextTimePart: string) => {
    if (!selectedDatePart) {
      return;
    }

    onChange(`${selectedDatePart}T${clampTimeInputPart(nextTimePart, timeMin)}`);
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-card",
          isOpen && "border-primary/40 bg-card",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-sm font-medium", value ? "text-foreground" : "text-muted-foreground")}>
              {value ? formatDateTimeButtonLabel(value) : placeholder}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {value ? "Click to change date or time" : "Choose a date from the calendar, then set the time"}
            </span>
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-[1.35rem] border border-border/60 bg-popover/95 shadow-2xl shadow-black/30 backdrop-blur-xl md:inset-x-auto md:w-[360px]">
          <div className="border-b border-border/50 bg-background/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Date</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMonthLabel(visibleMonth)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canMovePrev && setVisibleMonth((current) => addMonths(current, -1))}
                  disabled={!canMovePrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, inCurrentMonth }) => {
                const disabled = Boolean(minDate && isBeforeDay(date, minDate));
                const selected = Boolean(selectedDate && isSameDay(date, selectedDate));
                const today = isSameDay(date, new Date());

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => !disabled && handleDateSelect(date)}
                    disabled={disabled}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                      inCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                      !disabled && "hover:bg-primary/10 hover:text-primary",
                      selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      today && !selected && "ring-1 ring-primary/35",
                      disabled && "cursor-not-allowed text-muted-foreground/25",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Time
              </div>
              <Input
                type="time"
                value={selectedTimePart}
                min={timeMin}
                step={300}
                onChange={(event) => handleTimeSelect(event.target.value)}
                disabled={!selectedDatePart}
                className="h-11 rounded-xl [color-scheme:dark]"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {selectedDatePart ? "Five-minute steps keep scheduling consistent." : "Pick a date first, then choose the time."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildStartDateIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return undefined;
  }

  return parsed.toISOString();
}

function buildEndDateIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return undefined;
  }

  return parsed.toISOString();
}

function normalizeCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function normalizePrefix(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function targetUserLabel(value: GiftCodeRow["target_user_type"]): string {
  if (value === "premium") {
    return "Premium users";
  }
  if (value === "free") {
    return "Free users";
  }
  return "All users";
}

function statusLabel(status: GiftCodeRow["status"]): string {
  if (status === "revoked") {
    return "Disabled";
  }
  return status;
}

function statusTone(status: GiftCodeRow["status"]): "success" | "paused" | "info" | "danger" | "warning" {
  if (status === "available") return "success";
  if (status === "paused") return "paused";
  if (status === "redeemed") return "info";
  if (status === "revoked") return "danger";
  return "warning";
}

async function requestAdmin<T>(path: string, init?: RequestInit): Promise<T> {
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
    throw new Error(payload?.detail ?? "Admin request failed.");
  }

  return (await response.json()) as T;
}

export default function PromoCodesPage() {
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      if (!selectedPlanId) {
        throw new Error("Select a plan first.");
      }

      const payload = await requestAdmin<CreateGiftCodesResponse>("/gift-codes", {
        method: "POST",
        body: JSON.stringify({
          plan_id: selectedPlanId,
          quantity: quantityNumber,
          prefix: normalizedPrefix || undefined,
          custom_code: quantityNumber === 1 ? normalizeCodeInput(customCode.trim()) || undefined : undefined,
          start_date: buildStartDateIso(startDate),
          end_date: buildEndDateIso(endDate),
          max_uses: maxUsesNumber,
          per_user_limit: perUserLimitNumber,
          target_user_type: targetUserType,
          starts_paused: startsPaused,
        }),
      });

      setCodes((current) => [...payload.items, ...current]);
      setRecentBatch(payload.items);
      setCustomCode("");
      setStartDate("");
      setEndDate("");
      setMaxUses("1");
      setPerUserLimit("1");
      setTargetUserType("all");
      setMessage(payload.message);
      setIsCreateModalOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create redeem code.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (row: GiftCodeRow, nextStatus: "available" | "paused" | "revoked") => {
    setError(null);
    setMessage(null);
    setRowActionId(row.id);

    try {
      const updated = await requestAdmin<GiftCodeRow>(`/gift-codes/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      syncUpdatedCode(updated);
      setMessage(`Code ${updated.code} updated.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update redeem code.");
    } finally {
      setRowActionId(null);
    }
  };

  const handleCopy = async (
    event: ReactMouseEvent<HTMLElement>,
    value: string,
    label = "Copied to clipboard.",
  ) => {
    setError(null);
    try {
      const maxLeft = Math.max(24, window.innerWidth - 220);
      const x = Math.min(Math.max(24, event.clientX + 12), maxLeft);
      const y = Math.max(24, event.clientY - 14);
      setToastPosition({ x, y });
      await navigator.clipboard.writeText(value);
      setMessage(label);
    } catch {
      setError("Clipboard copy failed.");
    }
  };

  const handleCopyBatch = async (event: ReactMouseEvent<HTMLElement>) => {
    await handleCopy(event, recentBatch.map((item) => item.code).join("\n"), "Copied to clipboard.");
  };

  if (loading) {
    return <AdminMetricsTableLoadingSkeleton columns={7} />;
  }

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <SectionHeader
        eyebrow="Revenue Ops"
        title="Redeem codes"
        description="Create premium redeem codes with date windows, usage caps, audience targeting, and one-code-at-a-time protection for users."
        actions={(
          <>
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Gift className="h-4 w-4" />
              Create code
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadPage("refresh")} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Available" value={String(metrics.available)} detail="Ready to redeem right now." tone="success" />
        <MetricCard label="Redeemed" value={String(metrics.redeemed)} detail="Already claimed by users." tone="info" />
        <MetricCard label="Paused" value={String(metrics.paused)} detail="Created but intentionally blocked." tone="warning" />
        <MetricCard label="Expiring Soon" value={String(metrics.expiringSoon)} detail="Expires within the next 7 days." tone="danger" />
      </div>

      {error ? <Notice tone="warning" title="Something went wrong" description={error} /> : null}

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
          {recentBatch.length > 0 ? (
            <Card className="border-primary/20 bg-primary/5 shadow-sm">
              <CardHeader className="border-b border-primary/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Latest generated batch</CardTitle>
                    <CardDescription>Copy these codes now and share them with the intended users.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={(event) => void handleCopyBatch(event)}>
                    <Copy className="h-4 w-4" />
                    Copy all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-3">
                {recentBatch.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold tracking-[0.04em] text-foreground">{item.code}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.plan_name} · {item.max_uses} total use{item.max_uses === 1 ? "" : "s"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => void handleCopy(event, item.code)}
                      className="rounded-lg border border-border/50 bg-muted/20 p-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div />
          )}
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/40 bg-muted/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Redeem code inventory</CardTitle>
                  <CardDescription>Search by code, plan, or recipient. Review validity, usage, latest claim, and current status.</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{filteredCodes.length} shown</Badge>
                <Badge tone="info">{codes.length} total</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_220px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code, plan, or recipient"
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as GiftCodeRow["status"] | "all")}>
                <option value="all">All statuses</option>
                <option value="available">Available</option>
                <option value="paused">Paused</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </Select>

              <Select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
                <option value="all">All plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    <th className="border-b border-border px-3 py-3 font-medium">Code</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Plan</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Validity</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Usage</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Audience</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Latest claim</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Status</th>
                    <th className="border-b border-border px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td className="px-3 py-12 text-center text-sm text-muted-foreground" colSpan={8}>
                        No redeem codes match the current filters.
                      </td>
                    </tr>
                  ) : null}

                  {filteredCodes.map((row) => {
                    const busy = rowActionId === row.id;
                    return (
                      <tr key={row.id} className="align-top">
                        <td className="border-b border-border px-3 py-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={(event) => void handleCopy(event, row.code)}
                              className="mt-0.5 rounded-lg border border-border/50 bg-muted/20 p-2 text-muted-foreground transition-colors hover:text-foreground"
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <div>
                              <p className="text-[13px] font-bold tracking-[0.04em] text-foreground">{row.code}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">Created {formatDateTime(row.created_at, "Unknown")}</p>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          <p className="font-semibold text-foreground">{row.plan_name}</p>
                          {row.duration_days ? <p className="mt-1 text-[11px] text-muted-foreground">{row.duration_days} days</p> : null}
                        </td>

                        <td className="border-b border-border px-3 py-4 text-sm text-muted-foreground">
                          <div>Start {formatDateTime(row.start_date, "Immediate")}</div>
                          <div className="mt-1">End {formatDateTime(row.end_date, "No expiry")}</div>
                          {row.redeemed_at ? (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Latest use {formatDateTime(row.redeemed_at, "")}
                            </div>
                          ) : null}
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          <p className="font-medium text-foreground">{row.used_count} / {row.max_uses}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Per user: {row.per_user_limit}</p>
                          {row.status !== "redeemed" && row.end_date ? (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              Window limited
                            </div>
                          ) : null}
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          <p className="font-medium text-foreground">{targetUserLabel(row.target_user_type)}</p>
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          {row.recipient_name || row.recipient_username ? (
                            <div>
                              <p className="font-medium text-foreground">{row.recipient_name ?? "Unknown user"}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {row.recipient_username ? `@${row.recipient_username}` : "No username"}
                              </p>
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {row.redeemed_at ? formatDateTime(row.redeemed_at, "No claim date") : "Claim time unavailable"}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not claimed yet</span>
                          )}
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          <Badge tone={statusTone(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </td>

                        <td className="border-b border-border px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {row.status === "available" ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleStatusChange(row, "paused")}>
                                <PauseCircle className="h-4 w-4" />
                                Pause
                              </Button>
                            ) : null}

                            {row.status === "paused" ? (
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => void handleStatusChange(row, "available")}>
                                <PlayCircle className="h-4 w-4" />
                                Activate
                              </Button>
                            ) : null}

                            {(row.status === "available" || row.status === "paused") ? (
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void handleStatusChange(row, "revoked")}>
                                <Ban className="h-4 w-4" />
                                Revoke
                              </Button>
                            ) : (
                              <span className="px-1 py-2 text-[11px] font-medium text-muted-foreground">
                                {row.status === "redeemed" ? "Read-only" : "No action"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!submitting) {
                setIsCreateModalOpen(false);
              }
            }}
          />

          <Card className="relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-4xl overflow-hidden rounded-[28px] border-border/70 shadow-2xl">
            <CardHeader className="border-b border-border/40 bg-muted/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Create redeem codes</CardTitle>
                    <CardDescription>Generate one custom code or a full batch with audience, validity, and usage rules.</CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) {
                      setIsCreateModalOpen(false);
                    }
                  }}
                  className="rounded-xl border border-border/50 bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(100vh-11rem)] overflow-y-auto pt-6">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Premium plan</label>
                      <Select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                        {activePlans.length === 0 ? <option value="">No plans available</option> : null}
                        {activePlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} · {plan.duration_days} days · {formatPrice(plan.price)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Quantity</label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={quantity}
                          onChange={(event) => {
                            const next = event.target.value;
                            setQuantity(next);
                            if ((Number.parseInt(next || "1", 10) || 1) > 1 && customCode) {
                              setCustomCode("");
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Prefix</label>
                        <Input
                          value={prefix}
                          onChange={(event) => setPrefix(normalizePrefix(event.target.value))}
                          placeholder="PRIME"
                          maxLength={12}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Custom single code</label>
                      <Input
                        value={customCode}
                        onChange={(event) => setCustomCode(normalizeCodeInput(event.target.value))}
                        placeholder="PRIME-30DAY"
                        disabled={quantityNumber !== 1}
                      />
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Available only when quantity is 1. For batches, unique random suffixes are generated automatically.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Start date</label>
                        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={startDate ? "outline" : "secondary"}
                              className="w-full"
                              onClick={() => setStartDate("")}
                            >
                              Starts now
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={startDate ? "secondary" : "outline"}
                              className="w-full"
                              onClick={() => setStartDate((current) => current || currentDateTimeInputValue)}
                            >
                              Schedule
                            </Button>
                          </div>

                          {startDate ? (
                            <>
                              <DateTimePickerField
                                value={startDate}
                                onChange={setStartDate}
                                minValue={currentDateTimeInputValue}
                                placeholder="Select when this code becomes active"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(currentDateTimeInputValue)}>
                                  Next slot
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addMinutesToDateTimeInputValue(currentDateTimeInputValue, 60))}>
                                  +1 hour
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addDaysToDateTimeInputValue(currentDateTimeInputValue, 1))}>
                                  Tomorrow
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setStartDate(addDaysToDateTimeInputValue(currentDateTimeInputValue, 7))}>
                                  In 7 days
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Code can be redeemed immediately after creation.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">End date</label>
                        <div className="space-y-3 rounded-2xl border border-border/50 bg-background/60 p-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={endDate ? "outline" : "secondary"}
                              className="w-full"
                              onClick={() => setEndDate("")}
                            >
                              No expiry
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={endDate ? "secondary" : "outline"}
                              className="w-full"
                              onClick={() => setEndDate((current) => current || addDaysToDateTimeInputValue(effectiveStartDate, 7))}
                            >
                              Set end date
                            </Button>
                          </div>

                          {endDate ? (
                            <>
                              <DateTimePickerField
                                value={endDate}
                                onChange={setEndDate}
                                minValue={effectiveStartDate}
                                placeholder="Select when this code expires"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addMinutesToDateTimeInputValue(effectiveStartDate, 60 * 24))}>
                                  +24 hours
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 7))}>
                                  +7 days
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 30))}>
                                  +30 days
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, 60))}>
                                  +60 days
                                </Button>
                                {selectedPlan ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEndDate(addDaysToDateTimeInputValue(effectiveStartDate, selectedPlan.duration_days))}
                                  >
                                    Plan length
                                  </Button>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Code stays valid until you revoke or pause it.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Usage limit (global)</label>
                        <Input
                          type="number"
                          min={1}
                          max={5000}
                          value={maxUses}
                          onChange={(event) => setMaxUses(event.target.value)}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">Per-user limit</label>
                        <Input
                          type="number"
                          min={1}
                          max={maxUsesNumber}
                          value={perUserLimit}
                          onChange={(event) => setPerUserLimit(event.target.value)}
                        />
                        <p className="mt-2 text-[11px] text-muted-foreground">How many times one user can redeem this same code.</p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Target user type</label>
                      <Select value={targetUserType} onChange={(event) => setTargetUserType(event.target.value as GiftCodeRow["target_user_type"])}>
                        <option value="all">All users</option>
                        <option value="premium">Premium users</option>
                        <option value="free">Free users</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={startsPaused}
                        onChange={(event) => setStartsPaused(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">Create as paused</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Paused codes stay hidden from redemption until you activate them from inventory.
                        </span>
                      </span>
                    </label>

                    <Card className="rounded-2xl border-border/50 bg-background/70 shadow-none">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Preview</CardTitle>
                        <CardDescription>Final look before issuing the code.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold tracking-[0.04em] text-foreground">{previewCode}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {selectedPlan ? `${selectedPlan.name} · ${selectedPlan.duration_days} days` : "Choose a plan"}
                            </p>
                          </div>
                          <Badge tone={startsPaused ? "paused" : "success"}>
                            {startsPaused ? "Paused" : "Available"}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-[11px] text-muted-foreground">
                          <p>{maxUsesNumber} total use{maxUsesNumber === 1 ? "" : "s"} · {perUserLimitNumber} per user</p>
                          <p>{targetUserLabel(targetUserType)} · {startDate || endDate ? `${startDate ? formatDateTimeEntryLabel(startDate) : "Now"} → ${endDate ? formatDateTimeEntryLabel(endDate) : "No end date"}` : "No date restriction"}</p>
                          <p>Users with active redeem-code premium must wait until that period ends before using another code.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-border/40 pt-5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!submitting) {
                        setIsCreateModalOpen(false);
                      }
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !selectedPlanId}>
                    <Sparkles className={cn("h-4 w-4", submitting && "animate-spin")} />
                    {submitting ? "Creating..." : quantityNumber > 1 ? `Create ${quantityNumber} Codes` : "Create Code"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {message ? (
        <div
          className={cn(
            "pointer-events-none fixed z-[70] rounded-xl border border-success/25 bg-card/95 px-4 py-3 text-sm font-medium text-foreground shadow-xl backdrop-blur-sm transition-all duration-300",
            toastVisible ? "-translate-y-full opacity-100" : "translate-y-[-90%] opacity-0",
          )}
          style={{ left: toastPosition.x, top: toastPosition.y }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-black text-foreground">{value}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
          </div>
          <div
            className={cn(
              "mt-1 h-2.5 w-2.5 rounded-full",
              tone === "success" && "bg-success",
              tone === "info" && "bg-primary",
              tone === "warning" && "bg-warning",
              tone === "danger" && "bg-danger",
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
