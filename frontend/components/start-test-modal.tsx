"use client";

import { createPortal } from "react-dom";

import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";

import { StartTestAction } from "./start-test-action";
import { StartTestChoiceDialog } from "./start-test-choice-dialog";
import type { StartTestModalProps } from "./start-test-modal-types";
import { StartTestRulesDialog } from "./start-test-rules-dialog";
import { useStartTestModal } from "./use-start-test-modal";

export function StartTestModal(props: StartTestModalProps) {
  const controller = useStartTestModal(props);

  return (
    <>
      <StartTestAction controller={controller} />
      {controller.mounted && controller.open
        ? createPortal(
            <StartTestChoiceDialog controller={controller} />,
            document.body,
          )
        : null}
      {controller.mounted && controller.showPremiumModal
        ? createPortal(
            <PremiumUpgradeModal
              subscriptionHref={controller.subscriptionHref}
              onClose={controller.closePremiumModal}
            />,
            document.body,
          )
        : null}
      {controller.mounted && controller.showRules
        ? createPortal(
            <StartTestRulesDialog controller={controller} />,
            document.body,
          )
        : null}
    </>
  );
}

export type { StartTestModalProps } from "./start-test-modal-types";
