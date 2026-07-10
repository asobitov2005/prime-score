"use client";
import { useUserDetailPageController } from "./controller";
import { UserDetailPageView } from "./view";

export function UserDetailPage() {
  const scope = useUserDetailPageController();
  return <UserDetailPageView scope={scope} />;
}
