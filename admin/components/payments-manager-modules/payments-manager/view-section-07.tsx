"use client";
import type { PaymentsManagerScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice, PaymentStatus, SectionHeader, Select } from "../dependencies";
import { PAYMENT_STATUS_OPTIONS, formatDateTime, toneForStatus } from "../shared";
import { PaymentsManagerSection2 } from "./view-section-02";
import { PaymentsManagerSection3 } from "./view-section-03";
import { PaymentsManagerSection4 } from "./view-section-04";
import { PaymentsManagerSection5 } from "./view-section-05";
import { PaymentsManagerSection6 } from "./view-section-06";
import { PaymentsManagerSection7 } from "./view-section-07";

export function PaymentsManagerView1({ scope }: { scope: PaymentsManagerScope }) {
  const { refreshAll, refreshing, notice, settings, stats, handleSaveSettings, settingsDraft, setSettingsDraft, savingSettings, cards, handleActivateCard, activeCardId, handleCreateCard, cardDraft, setCardDraft, savingCard, payments, paymentDrafts, setPaymentDrafts, handleSavePayment, savingPaymentId, paymentsTotal, paymentsPage, router } = scope;
  return (
    (
        <div className="space-y-6">
          <PaymentsManagerSection2 scope={scope} />
    
          <PaymentsManagerSection3 scope={scope} />
    
          <PaymentsManagerSection4 scope={scope} />
    
          <PaymentsManagerSection5 scope={scope} />
    
          <PaymentsManagerSection6 scope={scope} />
    
          <PaymentsManagerSection7 scope={scope} />
        </div>
      )
  );
}
