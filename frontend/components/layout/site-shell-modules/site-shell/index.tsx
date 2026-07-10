"use client";
import type { SiteShellProps } from "../shared";
import { useSiteShellController } from "./controller";
import { SiteShellView } from "./view";

export function SiteShell(props: SiteShellProps) {
  const scope = useSiteShellController(props);
  return <SiteShellView scope={scope} />;
}
