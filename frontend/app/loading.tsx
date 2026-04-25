import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";

export default function GlobalLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 lg:px-8">
      <AppLoadingPlaceholder />
    </div>
  );
}
