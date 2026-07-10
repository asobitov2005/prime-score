"use client";
import type { ContentPanelScope } from "./controller";
import type { ContentSectionItem } from "./section-item";
import { Card } from "../dependencies";
import { ContentSectionHeader } from "./section-header";
import { ContentSectionBody } from "./section-body";

export function ContentSectionCard({ scope, item }: { scope: ContentPanelScope; item: ContentSectionItem }) {
  return (
    <Card className="overflow-hidden border-border shadow-md">
      <ContentSectionHeader scope={scope} item={item} />
      <ContentSectionBody scope={scope} item={item} />
    </Card>
  );
}
