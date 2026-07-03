import { BillingPanel } from "@/components/billing/BillingPanel";

export default function QuickBillingPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BillingPanel type="walk_in" pageMode />
    </div>
  );
}
