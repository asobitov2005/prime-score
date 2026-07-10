"use client";
import type { PromoCodesPageScope } from "./controller";
import { Notice } from "../dependencies";

export function PromoCodesPageSection4({ scope }: { scope: PromoCodesPageScope }) {
  const { error } = scope;
  return (
    {error ? <Notice tone="warning" title="Something went wrong" description={error} /> : null}
  );
}
