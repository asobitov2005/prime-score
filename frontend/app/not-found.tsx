import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <EmptyState
        icon="search-x"
        title="Page not found"
        description="This page is not available yet or the link is no longer valid."
        action={{ href: "/", label: "Back to landing" }}
        secondaryAction={{ href: "/tests", label: "Browse tests" }}
        className="w-full max-w-xl"
      />
    </main>
  );
}
