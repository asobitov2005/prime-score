"use client";
import type { UserDetailPageScope } from "./controller";
import { Link, SectionHeader, buttonClassName } from "../dependencies";

export function UserDetailPageSection2({ scope }: { scope: UserDetailPageScope }) {
  const { fullName, user } = scope;
  return (
    <SectionHeader
            eyebrow="User Detail"
            title={fullName}
            description={user.username ? `@${user.username}` : user.phone ?? "—"}
            actions={<Link href="/users" className={buttonClassName({ variant: "outline", size: "sm" })}>← Back to Users</Link>}
          />
  );
}
