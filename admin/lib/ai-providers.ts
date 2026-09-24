import type { AdminAiProviderModel, AiProvider, AiUseCase } from "@/lib/types";

// Product policy, independent of the models returned by a provider.
const USE_CASE_RESTRICTIONS: Partial<Record<AiProvider, readonly AiUseCase[]>> = {
  gpu_uz: ["writing_grader", "writing_improver", "writing_roast"],
};

export function getAiProviderLabel(provider: AiProvider, label?: string | null): string {
  return label?.trim() || (provider === "gpu_uz" ? "GPU.uz" : provider);
}

export function isAiProviderEligible(provider: AiProvider, useCase: AiUseCase): boolean {
  return USE_CASE_RESTRICTIONS[provider]?.includes(useCase) ?? true;
}

export function getSelectableAiModels(
  provider: AiProvider,
  useCase: AiUseCase,
  models: readonly AdminAiProviderModel[],
): AdminAiProviderModel[] {
  if (!isAiProviderEligible(provider, useCase)) return [];
  return models.filter((model) => model.isAccessible && model.isSelectable);
}
