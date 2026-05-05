import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";

export default function AppGroupLoading() {
  return (
    <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center p-4">
      <AppLoadingPlaceholder />
    </div>
  );
}
