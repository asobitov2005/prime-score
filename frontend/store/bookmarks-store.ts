"use client";

import { create } from "zustand";

import { createApiClient } from "@/lib/api/client";

/**
 * Backend-backed bookmark store.
 *
 * The source of truth is the `/me/favorites` API. We keep a light client-side
 * cache of `testId -> savedAt` so toggle buttons across the app can render the
 * saved state instantly and update optimistically. Nothing is persisted to
 * localStorage anymore — favorites now sync across devices.
 */
interface BookmarksState {
  /** testId -> ISO savedAt timestamp. */
  entries: Record<string, string>;
  hasHydrated: boolean;
  isHydrating: boolean;
  /** userId the current `entries` belong to, so we re-fetch on account switch. */
  hydratedUserId: string | null;
  isBookmarked: (testId: string) => boolean;
  ensureHydrated: (userId: string | null) => Promise<void>;
  toggleBookmark: (testId: string) => Promise<boolean>;
  reset: () => void;
}

export const useBookmarksStore = create<BookmarksState>()((set, get) => ({
  entries: {},
  hasHydrated: false,
  isHydrating: false,
  hydratedUserId: null,

  isBookmarked: (testId) => Boolean(get().entries[testId]),

  reset: () => set({ entries: {}, hasHydrated: true, isHydrating: false, hydratedUserId: null }),

  ensureHydrated: async (userId) => {
    const state = get();

    if (!userId) {
      // Signed out — nothing to load. Clear any stale cache from a prior session.
      if (state.hydratedUserId !== null || Object.keys(state.entries).length > 0 || !state.hasHydrated) {
        set({ entries: {}, hasHydrated: true, hydratedUserId: null });
      }
      return;
    }

    if (state.isHydrating) {
      return;
    }
    if (state.hasHydrated && state.hydratedUserId === userId) {
      return;
    }

    set({ isHydrating: true });
    try {
      const { data } = await createApiClient().getFavorites();
      const entries: Record<string, string> = {};
      for (const favorite of data) {
        entries[favorite.test_id] = favorite.saved_at;
      }
      set({ entries, hasHydrated: true, hydratedUserId: userId, isHydrating: false });
    } catch {
      // Keep the UI responsive even if the fetch fails; treat as no bookmarks.
      set({ hasHydrated: true, hydratedUserId: userId, isHydrating: false });
    }
  },

  toggleBookmark: async (testId) => {
    const wasSaved = Boolean(get().entries[testId]);
    const client = createApiClient();

    // Optimistic update.
    set((current) => {
      const entries = { ...current.entries };
      if (wasSaved) {
        delete entries[testId];
      } else {
        entries[testId] = new Date().toISOString();
      }
      return { entries };
    });

    try {
      if (wasSaved) {
        await client.removeFavorite(testId);
      } else {
        await client.addFavorite(testId);
      }
      return !wasSaved;
    } catch {
      // Roll back on failure.
      set((current) => {
        const entries = { ...current.entries };
        if (wasSaved) {
          entries[testId] = new Date().toISOString();
        } else {
          delete entries[testId];
        }
        return { entries };
      });
      return wasSaved;
    }
  },
}));
