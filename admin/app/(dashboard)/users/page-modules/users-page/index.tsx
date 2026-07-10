"use client";
import { useUsersPageController } from "./controller";
import { UsersPageView } from "./view";

export function UsersPage() {
  const scope = useUsersPageController();
  return <UsersPageView scope={scope} />;
}
