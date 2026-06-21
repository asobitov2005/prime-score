"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AccessType, TestCatalogItem, TestType } from "@/lib/types";

export interface BookmarkedTest {
  id: string;
  slug?: string | null;
  title: string;
  type: TestType;
  format: TestCatalogItem["format"];
  accessType: AccessType;
  source: string;
  sourceLabel: string;
  description?: string;
  questionCount?: number | null;
  estimatedMinutes?: number | null;
  href: string;
  actionLabel?: string;
  savedAt: string;
}

type BookmarkInput = Omit<BookmarkedTest, "savedAt"> & {
  savedAt?: string;
};

interface BookmarksState {
  items: BookmarkedTest[];
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  addBookmark: (item: BookmarkInput) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (item: BookmarkInput) => boolean;
  isBookmarked: (id: string) => boolean;
}

function normalizeBookmark(item: BookmarkInput): BookmarkedTest {
  return {
    ...item,
    savedAt: item.savedAt ?? new Date().toISOString(),
  };
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      addBookmark: (item) =>
        set((state) => {
          const nextItem = normalizeBookmark(item);
          const rest = state.items.filter((entry) => entry.id !== nextItem.id);
          return {
            items: [nextItem, ...rest],
          };
        }),
      removeBookmark: (id) =>
        set((state) => ({
          items: state.items.filter((entry) => entry.id !== id),
        })),
      toggleBookmark: (item) => {
        const saved = get().items.some((entry) => entry.id === item.id);
        if (saved) {
          get().removeBookmark(item.id);
          return false;
        }
        get().addBookmark(item);
        return true;
      },
      isBookmarked: (id) => get().items.some((entry) => entry.id === id),
    }),
    {
      name: "prime-bookmarks-storage",
      partialize: (state) => ({
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
