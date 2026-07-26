import { create } from "zustand";

type AppSidebarState = "open" | "collapsed";

export interface UIState {
  sidebar: AppSidebarState;
  isMobileSidebarOpen: boolean;
  activeAttemptTab: "questions" | "passage" | "transcript";
  isPausedNoticeVisible: boolean;
  toggleSidebar: () => void;
  setSidebar: (sidebar: AppSidebarState) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setActiveAttemptTab: (tab: UIState["activeAttemptTab"]) => void;
  showPausedNotice: () => void;
  hidePausedNotice: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Test comment: frontend UI store defaults.
  sidebar: "open",
  isMobileSidebarOpen: false,
  activeAttemptTab: "questions",
  isPausedNoticeVisible: true,
  toggleSidebar: () =>
    set((state) => ({
      sidebar: state.sidebar === "open" ? "collapsed" : "open"
    })),
  setSidebar: (sidebar) => set({ sidebar }),
  setMobileSidebarOpen: (isMobileSidebarOpen) => set({ isMobileSidebarOpen }),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setActiveAttemptTab: (activeAttemptTab) => set({ activeAttemptTab }),
  showPausedNotice: () => set({ isPausedNoticeVisible: true }),
  hidePausedNotice: () => set({ isPausedNoticeVisible: false })
}));
