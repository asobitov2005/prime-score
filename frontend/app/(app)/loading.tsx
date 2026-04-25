import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";

export default function AppGroupLoading() {
  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
      <AppLoadingPlaceholder
        title="Preparing your workspace"
        description="Loading your PrimeScore app screen with the latest session state and page data."
      />
    </div>
  );
}
