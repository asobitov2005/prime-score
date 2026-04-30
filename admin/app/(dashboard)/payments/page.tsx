import { PaymentsManager } from "@/components/payments-manager";
import { getAdminPaymentCards, getAdminPayments, getAdminPaymentSettings } from "@/lib/server-data";

export default async function PaymentsPage() {
  const [payments, cards, settings] = await Promise.all([
    getAdminPayments(),
    getAdminPaymentCards(),
    getAdminPaymentSettings(),
  ]);

  return <PaymentsManager initialPayments={payments} initialCards={cards} initialSettings={settings} />;
}
