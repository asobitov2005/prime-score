"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { Card, CardContent, CardHeader, CardTitle, Sparkles, VocabularySuggestionCard } from "../dependencies";

export function WritingResultReadyViewSection15({ scope }: { scope: WritingResultReadyViewScope }) {
  const { vocabularySuggestions } = scope;
  return (
    {vocabularySuggestions.length ? (
                <Card className="rounded-3xl border-border/60 bg-card/40 mt-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-500" />
                      Natural C1/C2 upgrades ({vocabularySuggestions.length})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Compact upgrades with one example sentence each.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {vocabularySuggestions.map((suggestion, index) => (
                        <VocabularySuggestionCard
                          key={`${suggestion.current_phrase}-${suggestion.improved_phrase}-${index}`}
                          suggestion={suggestion}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
  );
}
