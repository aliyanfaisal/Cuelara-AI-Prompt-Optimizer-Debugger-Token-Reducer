import { getPlans } from "./actions";
import PlansManager from "./PlansManager";

export const metadata = {
  title: "Subscription Plans | Admin",
};

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Define plan tiers and their per-tool daily limits. No payment processor is wired up yet — assign a plan to a
          user from the Users page to grant its limits.
        </p>
      </div>

      <PlansManager initialPlans={plans} />
    </div>
  );
}
