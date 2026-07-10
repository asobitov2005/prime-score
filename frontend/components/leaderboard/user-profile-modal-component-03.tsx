"use client";

import { UserProfileModalData } from "./user-profile-modal-component-02";

export interface LeaderboardUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfileModalData | null;
  isLoading?: boolean;
}
