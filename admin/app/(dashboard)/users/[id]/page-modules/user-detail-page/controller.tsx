"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";

export function useUserDetailPageController() {
  let scope = useBaseScope();
  scope = { ...scope, ...useControllerPart1(scope) };
  return scope;
}

export type UserDetailPageScope = ReturnType<typeof useUserDetailPageController>;
