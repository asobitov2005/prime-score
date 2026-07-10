"use client";
import type { PromoCodesPageScope } from "./controller";

export function PromoCodesPageSection14({ scope }: { scope: PromoCodesPageScope }) {
  const { submitting, setIsCreateModalOpen } = scope;
  return (
    <div
                className="absolute inset-0"
                onClick={() => {
                  if (!submitting) {
                    setIsCreateModalOpen(false);
                  }
                }}
              />
  );
}
