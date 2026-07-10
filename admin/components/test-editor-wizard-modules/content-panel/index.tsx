"use client";

import { useContentPanelController } from "./controller";
import { ContentPanelView } from "./view";

export function ContentPanel(
  props: Parameters<typeof useContentPanelController>[0],
) {
  const scope = useContentPanelController(props);
  return <ContentPanelView scope={scope} />;
}
