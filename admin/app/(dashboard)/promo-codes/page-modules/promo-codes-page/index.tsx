"use client";
import { usePromoCodesPageController } from "./controller";
import { PromoCodesPageView } from "./view";

export function PromoCodesPage() {
  const scope = usePromoCodesPageController();
  return <PromoCodesPageView scope={scope} />;
}
