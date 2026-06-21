"use client";

export function AdminTableLoadingSkeleton({
  rows = 5,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="min-w-full">
      <div
        className="grid gap-3 border-b border-border bg-muted/30 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(7rem, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-3 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(7rem, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <div key={columnIndex} className="flex min-h-8 items-center">
                <div
                  className="h-4 rounded-full bg-muted animate-pulse"
                  style={{ width: `${columnIndex === 0 ? 72 : columnIndex % 2 === 0 ? 48 : 64}%` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSpeakingTopicsLoadingSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-11/12 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-4/5 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminReviewLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/50 bg-background/60 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-28 rounded-full bg-muted animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="h-5 w-48 rounded-md bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-5/6 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-2/3 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
              <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-44 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-28 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-full max-w-lg rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-full max-w-2xl rounded-full bg-muted animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl bg-muted animate-pulse" />
        <div className="h-28 rounded-xl bg-muted animate-pulse" />
        <div className="h-28 rounded-xl bg-muted animate-pulse" />
      </div>
      <div className="h-72 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}

export function AdminMetricsTableLoadingSkeleton({
  columns = 6,
}: {
  columns?: number;
}) {
  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded-full bg-muted animate-pulse" />
        <div className="h-9 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="h-3 w-full max-w-2xl rounded-full bg-muted animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
            <div className="mt-4 h-8 w-20 rounded-lg bg-muted animate-pulse" />
            <div className="mt-3 h-3 w-36 max-w-full rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 p-5">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-80 max-w-full rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem]">
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <AdminTableLoadingSkeleton rows={6} columns={columns} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminSettingsLoadingSkeleton() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-20 rounded-full bg-muted animate-pulse" />
        <div className="h-9 w-44 rounded-lg bg-muted animate-pulse" />
        <div className="h-3 w-full max-w-xl rounded-full bg-muted animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="h-5 w-36 rounded-md bg-muted animate-pulse" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
              <div className="h-11 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
              <div className="h-11 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminAiSettingsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded-full bg-muted animate-pulse" />
        <div className="h-9 w-80 max-w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-3 w-full max-w-3xl rounded-full bg-muted animate-pulse" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-11 rounded-xl bg-muted animate-pulse" />
              <div className="h-11 rounded-xl bg-muted animate-pulse" />
            </div>
            <div className="mt-4 h-11 rounded-xl bg-muted animate-pulse" />
            <div className="mt-4 flex gap-3">
              <div className="h-9 w-20 rounded-lg bg-muted animate-pulse" />
              <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
              <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-border/50">
              <AdminTableLoadingSkeleton rows={4} columns={3} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-72 max-w-full rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/50 p-4">
              <div className="h-5 w-36 rounded-md bg-muted animate-pulse" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="h-10 rounded-lg bg-muted animate-pulse" />
                <div className="h-10 rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminFormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-44 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <div className="space-y-4">
          <div className="h-8 w-72 max-w-full rounded-lg bg-muted animate-pulse" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
              <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
              <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
            </div>
          ))}
          <div className="h-40 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
