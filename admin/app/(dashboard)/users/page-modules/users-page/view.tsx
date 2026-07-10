"use client";
import type { UsersPageScope } from "./controller";
import { UsersPageView1 } from "./view-section-04";

export function UsersPageView({ scope }: { scope: UsersPageScope }) {
  return <UsersPageView1 scope={scope} />;
}
