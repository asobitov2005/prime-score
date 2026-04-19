import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AdminSessionState {
  adminId: string | null;
  role: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (session: { adminId: string; role: string; accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
}

export const useAdminStore = create<AdminSessionState>()(
  persist(
    (set) => ({
      adminId: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setSession: ({ adminId, role, accessToken, refreshToken }) =>
        set({ adminId, role, accessToken, refreshToken, isAuthenticated: true }),
      clearSession: () =>
        set({ adminId: null, role: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "prime-admin-storage" }
  )
);
