"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { NavigationTransitionOverlay, Suspense, useEffect } from "../dependencies";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { children, dismissWelcomeBonus, setShowWelcomeBonusModal, hideSiteChrome, welcomeBonusVisible } = scope;
  useEffect(() => {
      if (!welcomeBonusVisible) {
        setShowWelcomeBonusModal(false);
        return;
      }
  
      const timeout = window.setTimeout(() => {
        setShowWelcomeBonusModal(true);
      }, 5000);
  
      return () => window.clearTimeout(timeout);
    }, [welcomeBonusVisible]);

  const closeWelcomeBonusModal = () => {
      setShowWelcomeBonusModal(false);
      dismissWelcomeBonus();
    };

  if (hideSiteChrome) {
      return (
        <>
          <Suspense fallback={null}>
            <NavigationTransitionOverlay />
          </Suspense>
          {children}
        </>
      );
    }

  return { closeWelcomeBonusModal };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
