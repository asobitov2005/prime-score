"use client";
import type { LoginPageClientScope } from "./controller";
import { ArrowLeft, ArrowRight, Check, Input, KeyRound, Link, Loader2, Send, ShieldCheck, Smartphone, cn, trackCtaClick } from "../dependencies";
import { display } from "../shared";
import { LoginPageClientSection2 } from "./view-section-02";
import { LoginPageClientSection3 } from "./view-section-03";
import { LoginPageClientSection4 } from "./view-section-04";
import { LoginPageClientSection5 } from "./view-section-06";

export function LoginPageClientView1({ scope }: { scope: LoginPageClientScope }) {
  const { step, BOT_USERNAME, setStep, code, isLoginBusy, handleVerify, digits, inputRef, setCode, isRedirecting, errorMsg, setErrorMsg } = scope;
  return (
    (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-slate-950 lg:grid lg:grid-cols-2">
          <LoginPageClientSection2 scope={scope} />
          <LoginPageClientSection3 scope={scope} />
    
          <LoginPageClientSection4 scope={scope} />
          <LoginPageClientSection5 scope={scope} />
        </div>
      )
  );
}
