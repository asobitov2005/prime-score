"use client";
import type { BaseScope } from "./base";
import { FormEvent, adminApi, useEffect, useMemo, useRouter, useState } from "../dependencies";
import { CardDraft, NoticeState, PaymentDraft, SettingsDraft, createCardDraft, createPaymentDrafts, createSettingsDraft } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { initialPayments, totalPayments, currentPage, initialCards, initialSettings } = scope;
  const router = useRouter();

  const [payments, setPayments] = useState(initialPayments);

  const [paymentsTotal, setPaymentsTotal] = useState(totalPayments);

  const [paymentsPage, setPaymentsPage] = useState(currentPage);

  const [cards, setCards] = useState(initialCards);

  const [settings, setSettings] = useState(initialSettings);

  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>(() => createPaymentDrafts(initialPayments));

  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() => createSettingsDraft(initialSettings));

  const [cardDraft, setCardDraft] = useState<CardDraft>(() => createCardDraft());

  const [notice, setNotice] = useState<NoticeState>(null);

  const [refreshing, setRefreshing] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);

  const [savingCard, setSavingCard] = useState(false);

  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);

  useEffect(() => {
      setPayments(initialPayments);
      setPaymentsTotal(totalPayments);
      setPaymentsPage(currentPage);
      setCards(initialCards);
      setSettings(initialSettings);
      setPaymentDrafts(createPaymentDrafts(initialPayments));
      setSettingsDraft(createSettingsDraft(initialSettings));
    }, [currentPage, initialCards, initialPayments, initialSettings, totalPayments]);

  useEffect(() => {
      if (!notice) {
        return undefined;
      }
      const timeoutId = window.setTimeout(() => setNotice(null), 3200);
      return () => window.clearTimeout(timeoutId);
    }, [notice]);

  const stats = useMemo(() => {
      const pending = payments.filter((item) => item.status === "pending" || item.status === "matched").length;
      const completed = payments.filter((item) => item.status === "completed").length;
      const activeCards = cards.filter((item) => item.isActive).length;
      return { pending, completed, activeCards };
    }, [cards, payments]);

  async function refreshAll() {
      setRefreshing(true);
      try {
        const [nextPayments, nextCards, nextSettings] = await Promise.all([
          adminApi.listPayments(paymentsPage, 20),
          adminApi.listPaymentCards(),
          adminApi.getPaymentSettings(),
        ]);
        setPayments(nextPayments.items);
        setPaymentsTotal(nextPayments.total);
        setPaymentsPage(nextPayments.page);
        setCards(nextCards);
        setSettings(nextSettings);
        setPaymentDrafts(createPaymentDrafts(nextPayments.items));
        setSettingsDraft(createSettingsDraft(nextSettings));
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "Refresh failed",
          description: error instanceof Error ? error.message : "Payment data could not be refreshed.",
        });
      } finally {
        setRefreshing(false);
      }
    }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setSavingSettings(true);
      try {
        const nextSettings = await adminApi.updatePaymentSettings({
          supportContact: settingsDraft.supportContact.trim() || "@TheBugCreator",
        });
        setSettings(nextSettings);
        setSettingsDraft(createSettingsDraft(nextSettings));
        setNotice({
          tone: "success",
          title: "Settings saved",
          description: "Manual payment support contact was updated.",
        });
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "Settings failed",
          description: error instanceof Error ? error.message : "Payment settings could not be saved.",
        });
      } finally {
        setSavingSettings(false);
      }
    }

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!cardDraft.label.trim() || !cardDraft.cardNumber.trim()) {
        setNotice({
          tone: "warning",
          title: "Card details missing",
          description: "Label and card number are required.",
        });
        return;
      }
  
      setSavingCard(true);
      try {
        const nextCard = await adminApi.createPaymentCard({
          label: cardDraft.label.trim(),
          cardNumber: cardDraft.cardNumber.trim(),
          cardType: cardDraft.cardType,
          holderName: cardDraft.holderName.trim() || null,
          priority: Number(cardDraft.priority) || 0,
          isActive: cardDraft.isActive,
        });
  
        const nextCards = await adminApi.listPaymentCards();
        setCards(nextCards);
        setCardDraft(createCardDraft());
        setNotice({
          tone: "success",
          title: "Card saved",
          description: `${nextCard.label} is ready for new invoices.`,
        });
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "Card failed",
          description: error instanceof Error ? error.message : "Payment card could not be saved.",
        });
      } finally {
        setSavingCard(false);
      }
    }

  async function handleActivateCard(cardId: string) {
      setActiveCardId(cardId);
      try {
        const updated = await adminApi.updatePaymentCard(cardId, { isActive: true });
        setCards((current) =>
          current
            .map((item) => ({ ...item, isActive: item.id === updated.id }))
            .sort((left, right) => Number(right.isActive) - Number(left.isActive) || right.priority - left.priority),
        );
        setNotice({
          tone: "success",
          title: "Active card changed",
          description: "New invoices will now use the selected card.",
        });
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "Activation failed",
          description: error instanceof Error ? error.message : "Card activation could not be completed.",
        });
      } finally {
        setActiveCardId(null);
      }
    }

  async function handleSavePayment(paymentId: string) {
      const draft = paymentDrafts[paymentId];
      if (!draft) {
        return;
      }
  
      setSavingPaymentId(paymentId);
      try {
        const updated = await adminApi.updatePaymentStatus(paymentId, {
          status: draft.status,
          statusReason: draft.statusReason.trim() || null,
        });
        setPayments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setPaymentDrafts((current) => ({
          ...current,
          [paymentId]: {
            status: updated.status === "paused" || updated.status === "refunded" ? "review" : updated.status,
            statusReason: updated.statusReason ?? "",
          },
        }));
        setNotice({
          tone: "success",
          title: "Payment updated",
          description:
            updated.status === "completed"
              ? "Payment marked completed and premium grant was applied."
              : "Payment status was updated.",
        });
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "Payment update failed",
          description: error instanceof Error ? error.message : "Payment status could not be updated.",
        });
      } finally {
        setSavingPaymentId(null);
      }
    }

  return { router, payments, setPayments, paymentsTotal, setPaymentsTotal, paymentsPage, setPaymentsPage, cards, setCards, settings, setSettings, paymentDrafts, setPaymentDrafts, settingsDraft, setSettingsDraft, cardDraft, setCardDraft, notice, setNotice, refreshing, setRefreshing, savingSettings, setSavingSettings, savingCard, setSavingCard, activeCardId, setActiveCardId, savingPaymentId, setSavingPaymentId, stats, refreshAll, handleSaveSettings, handleCreateCard, handleActivateCard, handleSavePayment };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
