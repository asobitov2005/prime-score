"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { adminApi } from "@/lib/api";
import type { AdminPaymentCardSummary, AdminPaymentSettingsSummary, AdminPaymentSummary, PaymentStatus } from "@/lib/types";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice, SectionHeader, Select } from "@/components/ui";

type PaymentManagerProps = {
  initialPayments: AdminPaymentSummary[];
  initialCards: AdminPaymentCardSummary[];
  initialSettings: AdminPaymentSettingsSummary | null;
};

type NoticeState = {
  tone: "success" | "warning";
  title: string;
  description: string;
} | null;

type PaymentDraft = {
  status: Exclude<PaymentStatus, "paused" | "refunded">;
  statusReason: string;
};

type SettingsDraft = {
  telegramApiId: string;
  telegramApiHash: string;
  phoneNumber: string;
  activeBot: "HUMOcardbot" | "CardXabarBot";
  supportContact: string;
  isEnabled: boolean;
  pollFallbackEnabled: boolean;
};

type CardDraft = {
  label: string;
  cardNumber: string;
  cardType: "humo" | "uzcard";
  holderName: string;
  priority: string;
  botSource: "HUMOcardbot" | "CardXabarBot";
  isActive: boolean;
};

const PAYMENT_STATUS_OPTIONS: Array<Exclude<PaymentStatus, "paused" | "refunded">> = [
  "pending",
  "matched",
  "completed",
  "review",
  "failed",
  "expired",
  "canceled",
];

function createSettingsDraft(settings: AdminPaymentSettingsSummary | null): SettingsDraft {
  return {
    telegramApiId: settings?.telegramApiId ?? "",
    telegramApiHash: settings?.telegramApiHash ?? "",
    phoneNumber: settings?.phoneNumber ?? "",
    activeBot: settings?.activeBot === "CardXabarBot" ? "CardXabarBot" : "HUMOcardbot",
    supportContact: settings?.supportContact ?? "",
    isEnabled: settings?.isEnabled ?? false,
    pollFallbackEnabled: settings?.pollFallbackEnabled ?? true,
  };
}

function createCardDraft(): CardDraft {
  return {
    label: "",
    cardNumber: "",
    cardType: "humo",
    holderName: "",
    priority: "0",
    botSource: "HUMOcardbot",
    isActive: false,
  };
}

function createPaymentDrafts(payments: AdminPaymentSummary[]): Record<string, PaymentDraft> {
  return Object.fromEntries(
    payments.map((payment) => [
      payment.id,
      {
        status: payment.status === "paused" || payment.status === "refunded" ? "review" : payment.status,
        statusReason: payment.statusReason ?? "",
      },
    ]),
  );
}

function toneForStatus(status: PaymentStatus): "neutral" | "success" | "warning" | "danger" | "paused" {
  if (status === "completed") {
    return "success";
  }
  if (status === "pending" || status === "matched") {
    return "warning";
  }
  if (status === "failed" || status === "review") {
    return "danger";
  }
  if (status === "expired" || status === "canceled" || status === "paused") {
    return "paused";
  }
  return "neutral";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function PaymentsManager({ initialPayments, initialCards, initialSettings }: PaymentManagerProps) {
  const [payments, setPayments] = useState(initialPayments);
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
    setCards(initialCards);
    setSettings(initialSettings);
    setPaymentDrafts(createPaymentDrafts(initialPayments));
    setSettingsDraft(createSettingsDraft(initialSettings));
  }, [initialCards, initialPayments, initialSettings]);

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
        adminApi.listPayments(),
        adminApi.listPaymentCards(),
        adminApi.getPaymentSettings(),
      ]);
      setPayments(nextPayments);
      setCards(nextCards);
      setSettings(nextSettings);
      setPaymentDrafts(createPaymentDrafts(nextPayments));
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
        telegramApiId: settingsDraft.telegramApiId.trim() || null,
        telegramApiHash: settingsDraft.telegramApiHash.trim() || null,
        phoneNumber: settingsDraft.phoneNumber.trim() || null,
        activeBot: settingsDraft.activeBot,
        supportContact: settingsDraft.supportContact.trim() || null,
        isEnabled: settingsDraft.isEnabled,
        pollFallbackEnabled: settingsDraft.pollFallbackEnabled,
      });
      setSettings(nextSettings);
      setSettingsDraft(createSettingsDraft(nextSettings));
      setNotice({
        tone: "success",
        title: "Settings saved",
        description: "Payment detector configuration was updated.",
      });
    } catch (error) {
      setNotice({
        tone: "warning",
        title: "Settings failed",
        description: error instanceof Error ? error.message : "Detector settings could not be saved.",
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
        botSource: cardDraft.botSource,
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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Revenue ops"
        title="Payments"
        description="Card-transfer invoice lifecycle, detector readiness, and manual settlement controls."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshAll()} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {notice ? <Notice tone={notice.tone} title={notice.title} description={notice.description} /> : null}

      <Notice
        tone={settings?.isEnabled ? "success" : "paused"}
        title="Payment ingestion"
        description={
          settings?.isEnabled
            ? "Detector settings are configured. Keep an eye on pending invoices and the currently active card."
            : "Detector is still disabled. Add a live card, Telegram credentials, and support contact before enabling auto-detection."
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending invoices</CardDescription>
            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed invoices</CardDescription>
            <CardTitle className="text-2xl">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active cards</CardDescription>
            <CardTitle className="text-2xl">{stats.activeCards}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detector settings</CardTitle>
            <CardDescription>These values drive the Telethon worker and user-facing support instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveSettings}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telegram-api-id">Telegram API ID</Label>
                  <Input
                    id="telegram-api-id"
                    value={settingsDraft.telegramApiId}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, telegramApiId: event.target.value }))}
                    placeholder="28943711"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-phone">Telegram phone</Label>
                  <Input
                    id="telegram-phone"
                    value={settingsDraft.phoneNumber}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, phoneNumber: event.target.value }))}
                    placeholder="+998901234567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram-api-hash">Telegram API hash</Label>
                <Input
                  id="telegram-api-hash"
                  value={settingsDraft.telegramApiHash}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, telegramApiHash: event.target.value }))}
                  placeholder="Paste API hash"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="active-bot">Notification bot</Label>
                  <Select
                    id="active-bot"
                    value={settingsDraft.activeBot}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({
                        ...current,
                        activeBot: event.target.value === "CardXabarBot" ? "CardXabarBot" : "HUMOcardbot",
                      }))
                    }
                  >
                    <option value="HUMOcardbot">HUMOcardbot</option>
                    <option value="CardXabarBot">CardXabarBot</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support-contact">Support contact</Label>
                  <Input
                    id="support-contact"
                    value={settingsDraft.supportContact}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, supportContact: event.target.value }))}
                    placeholder="@primescore_support"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-md border border-border px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsDraft.isEnabled}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, isEnabled: event.target.checked }))}
                  />
                  <span>Enable detector</span>
                </label>
                <label className="flex items-center gap-3 rounded-md border border-border px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsDraft.pollFallbackEnabled}
                    onChange={(event) =>
                      setSettingsDraft((current) => ({ ...current, pollFallbackEnabled: event.target.checked }))
                    }
                  />
                  <span>Enable fallback polling</span>
                </label>
              </div>

              <Button type="submit" disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save detector settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment cards</CardTitle>
            <CardDescription>Invoices always use one active card. Switch it here before traffic changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {cards.length === 0 ? (
                <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  No cards configured yet.
                </div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{card.label}</p>
                        <Badge tone={card.isActive ? "success" : "paused"}>{card.isActive ? "Active" : "Standby"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {card.cardType} • {card.cardNumber} • {card.botSource}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleActivateCard(card.id)}
                      disabled={card.isActive || activeCardId === card.id}
                    >
                      {card.isActive ? "In use" : activeCardId === card.id ? "Switching..." : "Set active"}
                    </Button>
                  </div>
                ))
              )}
            </div>

            <form className="space-y-4 rounded-lg border border-border/80 p-4" onSubmit={handleCreateCard}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="card-label">Card label</Label>
                  <Input
                    id="card-label"
                    value={cardDraft.label}
                    onChange={(event) => setCardDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Main HUMO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card number</Label>
                  <Input
                    id="card-number"
                    value={cardDraft.cardNumber}
                    onChange={(event) => setCardDraft((current) => ({ ...current, cardNumber: event.target.value }))}
                    placeholder="8600 1234 5678 9012"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="card-type">Card type</Label>
                  <Select
                    id="card-type"
                    value={cardDraft.cardType}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        cardType: event.target.value === "uzcard" ? "uzcard" : "humo",
                      }))
                    }
                  >
                    <option value="humo">HUMO</option>
                    <option value="uzcard">UzCard</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bot-source">Bot source</Label>
                  <Select
                    id="bot-source"
                    value={cardDraft.botSource}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        botSource: event.target.value === "CardXabarBot" ? "CardXabarBot" : "HUMOcardbot",
                      }))
                    }
                  >
                    <option value="HUMOcardbot">HUMOcardbot</option>
                    <option value="CardXabarBot">CardXabarBot</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="holder-name">Holder name</Label>
                  <Input
                    id="holder-name"
                    value={cardDraft.holderName}
                    onChange={(event) => setCardDraft((current) => ({ ...current, holderName: event.target.value }))}
                    placeholder="Azizbek A."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="0"
                    max="1000"
                    value={cardDraft.priority}
                    onChange={(event) => setCardDraft((current) => ({ ...current, priority: event.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-border px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={cardDraft.isActive}
                  onChange={(event) => setCardDraft((current) => ({ ...current, isActive: event.target.checked }))}
                />
                <span>Make active immediately</span>
              </label>

              <Button type="submit" disabled={savingCard}>
                {savingCard ? "Saving..." : "Add payment card"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent payment records</CardTitle>
          <CardDescription>Use this table for review, manual completion, or canceling stale invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {payments.length === 0 ? (
            <div className="rounded-md border border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              No payment records found.
            </div>
          ) : (
            payments.map((payment) => {
              const draft = paymentDrafts[payment.id];
              return (
                <div key={payment.id} className="rounded-lg border border-border/80 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_auto] xl:items-start">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{payment.user}</p>
                        <Badge tone={toneForStatus(payment.status)}>{payment.status}</Badge>
                        <Badge tone="neutral">{payment.method}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.plan} • {payment.amount} sum
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.card} • {payment.invoiceCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatDateTime(payment.expiresAt)} • Updated: {formatDateTime(payment.updatedAt)}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`status-${payment.id}`}>Status</Label>
                        <Select
                          id={`status-${payment.id}`}
                          value={draft?.status ?? "review"}
                          onChange={(event) =>
                            setPaymentDrafts((current) => ({
                              ...current,
                              [payment.id]: {
                                status: event.target.value as Exclude<PaymentStatus, "paused" | "refunded">,
                                statusReason: current[payment.id]?.statusReason ?? "",
                              },
                            }))
                          }
                        >
                          {PAYMENT_STATUS_OPTIONS.map((statusOption) => (
                            <option key={statusOption} value={statusOption}>
                              {statusOption}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reason-${payment.id}`}>Reason</Label>
                        <Input
                          id={`reason-${payment.id}`}
                          value={draft?.statusReason ?? ""}
                          onChange={(event) =>
                            setPaymentDrafts((current) => ({
                              ...current,
                              [payment.id]: {
                                status: current[payment.id]?.status ?? "review",
                                statusReason: event.target.value,
                              },
                            }))
                          }
                          placeholder="Optional admin note"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSavePayment(payment.id)}
                      disabled={savingPaymentId === payment.id}
                    >
                      {savingPaymentId === payment.id ? "Saving..." : "Apply"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
