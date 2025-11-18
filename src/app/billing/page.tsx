import { CreditBalance } from "@/components/billing/credit-balance";
import { PlanDetails } from "@/components/billing/plan-details";
import { TransactionsTable } from "@/components/billing/transactions-table";
import { transactions } from "@/lib/data";

export default function BillingPage() {
  const subscription = {
    id: "sub_123",
    shopId: "shop_123",
    plan: "Pro",
    status: "active",
    startDate: new Date("2023-10-01T00:00:00Z"),
    endDate: new Date("2024-10-01T00:00:00Z"),
    autoRenew: true,
  };

  const currentCredits = 4520;

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
       <h1 className="text-2xl font-headline sm:text-3xl">Billing & Usage</h1>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <PlanDetails subscription={subscription} />
        <CreditBalance credits={currentCredits} />
      </div>
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
