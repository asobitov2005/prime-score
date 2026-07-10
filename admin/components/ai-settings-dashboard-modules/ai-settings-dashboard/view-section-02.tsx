"use client";
import type { AiSettingsDashboardScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice } from "../dependencies";
import { createProviderDraft, toneForSync } from "../shared";

export function AiSettingsDashboardSection2({ scope }: { scope: AiSettingsDashboardScope }) {
  const { providers, providerDrafts, modelsByProvider, setProviderDraft, handleSaveProvider, busyKey, handleValidateProvider, handleSyncProvider } = scope;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
            {providers.map((provider) => {
              const draft = providerDrafts[provider.provider] ?? createProviderDraft(provider);
              const models = modelsByProvider[provider.provider] ?? [];
              return (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>{provider.label}</CardTitle>
                        <CardDescription>{provider.provider}</CardDescription>
                      </div>
                      <Badge tone={toneForSync(provider.lastSyncStatus)}>{provider.lastSyncStatus ?? "idle"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input value={draft.label} onChange={(event) => setProviderDraft(provider.provider, { label: event.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Base URL</Label>
                        <Input value={draft.baseUrl} onChange={(event) => setProviderDraft(provider.provider, { baseUrl: event.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        placeholder={provider.apiKeyMasked ?? "Paste a new API key"}
                        value={draft.apiKey}
                        onChange={(event) => setProviderDraft(provider.provider, { apiKey: event.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => handleSaveProvider(provider.provider)} disabled={busyKey !== null}>Save</Button>
                      <Button variant="secondary" onClick={() => handleValidateProvider(provider.provider)} disabled={busyKey !== null}>Validate</Button>
                      <Button onClick={() => handleSyncProvider(provider.provider)} disabled={busyKey !== null}>Fetch Models</Button>
                    </div>
                    {provider.lastSyncError ? <Notice tone="warning" title="Last sync error" description={provider.lastSyncError} /> : null}
                    <div className="rounded-lg border border-border">
                      <div className="grid grid-cols-[1.3fr,1fr,auto] gap-3 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span>Model</span>
                        <span>Family</span>
                        <span>Status</span>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        {models.map((model) => (
                          <div key={model.id} className="grid grid-cols-[1.3fr,1fr,auto] gap-3 px-4 py-3 text-sm border-b last:border-b-0 border-border">
                            <div>
                              <p className="font-medium">{model.displayName}</p>
                              <p className="text-xs text-muted-foreground">{model.modelId}</p>
                            </div>
                            <span>{model.family ?? "-"}</span>
                            <Badge tone={model.isSelectable ? "success" : "warning"}>{model.isSelectable ? "selectable" : "limited"}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
  );
}
