"use client";
import { useBaseScope } from "./base";
import { useControllerPart1 } from "./controller-part-01";
import { useControllerPart2 } from "./controller-part-02";
import { useControllerPart3 } from "./controller-part-03";
import { useControllerPart4 } from "./controller-part-04";
import { useControllerPart5 } from "./controller-part-05";
import { useControllerPart6 } from "./controller-part-06";
import { useControllerPart7 } from "./controller-part-07";
import { useControllerPart8 } from "./controller-part-08";
import { useControllerPart9 } from "./controller-part-09";
import { useControllerPart10 } from "./controller-part-10";
import { useControllerPart11 } from "./controller-part-11";
import { useControllerPart12 } from "./controller-part-12";
import { useControllerPart13 } from "./controller-part-13";
import { useControllerPart14 } from "./controller-part-14";

export function useReadingExamPreviewController(props: { mode: PreviewMode; data?: ReadingExamPreviewData }) {
  let scope = useBaseScope(props);
  scope = { ...scope, ...useControllerPart1(scope) };
  scope = { ...scope, ...useControllerPart2(scope) };
  scope = { ...scope, ...useControllerPart3(scope) };
  scope = { ...scope, ...useControllerPart4(scope) };
  scope = { ...scope, ...useControllerPart5(scope) };
  scope = { ...scope, ...useControllerPart6(scope) };
  scope = { ...scope, ...useControllerPart7(scope) };
  scope = { ...scope, ...useControllerPart8(scope) };
  scope = { ...scope, ...useControllerPart9(scope) };
  scope = { ...scope, ...useControllerPart10(scope) };
  scope = { ...scope, ...useControllerPart11(scope) };
  scope = { ...scope, ...useControllerPart12(scope) };
  scope = { ...scope, ...useControllerPart13(scope) };
  scope = { ...scope, ...useControllerPart14(scope) };
  return scope;
}

export type ReadingExamPreviewScope = ReturnType<typeof useReadingExamPreviewController>;
