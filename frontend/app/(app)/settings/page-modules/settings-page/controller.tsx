"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useSettingsPageController() {
  let scope = useBaseScope();
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type SettingsPageScope = ReturnType<typeof useSettingsPageController>;
