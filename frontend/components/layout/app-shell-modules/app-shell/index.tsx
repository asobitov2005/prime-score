"use client";
import type { AppShellProps } from "../shared";
import { useAppShellController } from "./controller";
import { AppShellView } from "./view";

export function AppShell(props: AppShellProps) {
  const scope = useAppShellController(props);
  return <AppShellView scope={scope} />;
}
