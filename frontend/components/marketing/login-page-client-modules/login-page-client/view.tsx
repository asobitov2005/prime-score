"use client";
import type { LoginPageClientScope } from "./controller";
import { LoginPageClientView1 } from "./view-section-06";

export function LoginPageClientView({ scope }: { scope: LoginPageClientScope }) {
  return <LoginPageClientView1 scope={scope} />;
}
