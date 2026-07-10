"use client";
import { useLoginPageClientController } from "./controller";
import { LoginPageClientView } from "./view";

export function LoginPageClient() {
  const scope = useLoginPageClientController();
  return <LoginPageClientView scope={scope} />;
}
