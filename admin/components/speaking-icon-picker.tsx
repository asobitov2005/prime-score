"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, Label, cn } from "@/components/ui";
import {
  SPEAKING_ICON_TONE_STYLES,
  SPEAKING_ICON_TONES,
  filterSpeakingIcons,
  iconsForPart,
  isSpeakingIconTone,
  type SpeakingIconTone,
} from "@/lib/speaking-icons";
import type { SpeakingPartNumber } from "@/lib/speaking-api";

export function SpeakingIconPicker({
  part,
  iconId,
  iconTone,
  onIconChange,
  onToneChange,
}: {
  part: SpeakingPartNumber;
  iconId: string;
  iconTone: SpeakingIconTone;
  onIconChange: (iconId: string) => void;
  onToneChange: (tone: SpeakingIconTone) => void;
}) {
  const [search, setSearch] = useState("");
  const options = iconsForPart(part);
  const filteredOptions = useMemo(() => filterSpeakingIcons(options, search), [options, search]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="icon_search">Icon</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="icon_search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search icons… e.g. travel, food, music"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-border/70 bg-muted/10 p-2">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No icons match your search.</p>
          ) : (
            <div className="grid grid-cols-7 sm:grid-cols-9 md:grid-cols-11 gap-1.5">
              {filteredOptions.map(({ id, label, Icon }) => {
                const selected = iconId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => onIconChange(id)}
                    className={cn(
                      "flex items-center justify-center rounded-lg border p-1 transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border",
                        SPEAKING_ICON_TONE_STYLES[iconTone],
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {filteredOptions.length} of {options.length} icons · hover to see name
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon_tone">Icon color</Label>
        <div className="flex flex-wrap gap-1.5">
          {SPEAKING_ICON_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => onToneChange(tone)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                iconTone === tone
                  ? SPEAKING_ICON_TONE_STYLES[tone]
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40",
              )}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function parseTopicIconMetadata(metadata: Record<string, unknown> | undefined): {
  iconId: string;
  iconTone: SpeakingIconTone;
} {
  const iconId = typeof metadata?.icon === "string" ? metadata.icon : "";
  const rawTone = typeof metadata?.icon_tone === "string" ? metadata.icon_tone : "purple";
  return {
    iconId,
    iconTone: isSpeakingIconTone(rawTone) ? rawTone : "purple",
  };
}
