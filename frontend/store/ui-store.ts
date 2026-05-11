import { create } from "zustand";

type AppSidebarState = "open" | "collapsed";

export interface UIState {
  sidebar: AppSidebarState;
  activeAttemptTab: "questions" | "passage" | "transcript";
  isPausedNoticeVisible: boolean;
  toggleSidebar: () => void;
  setSidebar: (sidebar: AppSidebarState) => void;
  setActiveAttemptTab: (tab: UIState["activeAttemptTab"]) => void;
  showPausedNotice: () => void;
  hidePausedNotice: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Test comment: frontend UI store defaults.
  sidebar: "open",
  activeAttemptTab: "questions",
  isPausedNoticeVisible: true,
  toggleSidebar: () =>
    set((state) => ({
      sidebar: state.sidebar === "open" ? "collapsed" : "open"
    })),
  setSidebar: (sidebar) => set({ sidebar }),
  setActiveAttemptTab: (activeAttemptTab) => set({ activeAttemptTab }),
  showPausedNotice: () => set({ isPausedNoticeVisible: true }),
  hidePausedNotice: () => set({ isPausedNoticeVisible: false })
}));
