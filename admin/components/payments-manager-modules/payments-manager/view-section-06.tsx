"use client";
import type { PaymentsManagerScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "../dependencies";

export function PaymentsManagerSection6({ scope }: { scope: PaymentsManagerScope }) {
  const { handleSaveSettings, settingsDraft, setSettingsDraft, savingSettings, cards, handleActivateCard, activeCardId, handleCreateCard, cardDraft, setCardDraft, savingCard } = scope;
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle>Support settings</CardTitle>
                <CardDescription>This contact is shown to users after they create a manual card-transfer invoice.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveSettings}>
                  <div className="space-y-2">
                    <Label htmlFor="support-contact">Telegram support contact</Label>
                    <Input
                      id="support-contact"
                      value={settingsDraft.supportContact}
                      onChange={(event) => setSettingsDraft((current) => ({ ...current, supportContact: event.target.value }))}
                      placeholder="@TheBugCreator"
                    />
                    <p className="text-xs text-muted-foreground">
                      User instruction: transfer the required amount, then send the receipt screenshot to this Telegram contact.
                    </p>
                  </div>
    
                  <Button type="submit" disabled={savingSettings}>
                    {savingSettings ? "Saving..." : "Save support contact"}
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
                            {card.cardType} • {card.cardNumber}
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
                      <Label htmlFor="holder-name">Holder name</Label>
                      <Input
                        id="holder-name"
                        value={cardDraft.holderName}
                        onChange={(event) => setCardDraft((current) => ({ ...current, holderName: event.target.value }))}
                        placeholder="Azizbek A."
                      />
                    </div>
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
  );
}
