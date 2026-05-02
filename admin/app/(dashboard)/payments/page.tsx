import { PaymentsManager } from "@/components/payments-manager";
import { getAdminPaymentCards, getAdminPayments, getAdminPaymentSettings } from "@/lib/server-data";

export default async function PaymentsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parseInt(searchParams.page || "1", 10);
  const [paymentsData, cards, settings] = await Promise.all([
    getAdminPayments(page, 20),
    getAdminPaymentCards(),
    getAdminPaymentSettings(),
  ]);

  return (
    <PaymentsManager
      initialPayments={paymentsData.items}
      totalPayments={paymentsData.total}
      currentPage={paymentsData.page}
      initialCards={cards}
      initialSettings={settings}
    />
  );
}
