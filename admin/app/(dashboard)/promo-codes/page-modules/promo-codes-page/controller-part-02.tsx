"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { AdminMetricsTableLoadingSkeleton, FormEvent, ReactMouseEvent } from "../dependencies";
import { CreateGiftCodesResponse, GiftCodeRow, buildEndDateIso, buildStartDateIso, normalizeCodeInput, requestAdmin } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { setCodes, recentBatch, setRecentBatch, loading, setSubmitting, setRowActionId, setError, setMessage, setToastPosition, setIsCreateModalOpen, selectedPlanId, customCode, setCustomCode, startDate, setStartDate, endDate, setEndDate, setMaxUses, setPerUserLimit, targetUserType, setTargetUserType, startsPaused, quantityNumber, maxUsesNumber, perUserLimitNumber, normalizedPrefix, syncUpdatedCode } = scope;
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

  return { handleCreate, handleStatusChange, handleCopy, handleCopyBatch };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
