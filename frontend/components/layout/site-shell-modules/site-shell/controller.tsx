"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";

export function useSiteShellController(props: SiteShellProps) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  return scope;
}

export type SiteShellScope = ReturnType<typeof useSiteShellController>;
