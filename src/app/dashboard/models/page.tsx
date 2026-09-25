import { getEffectivePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { getOwnModelsState } from "./actions";
import { ActivateOwnKeysPlan, ModelsManager } from "./ModelsManager";

export const metadata = { title: "AI Models" };

export default async function ModelsPage() {
  const session = (await getSessionUser())!;
  const plan = await getEffectivePlan(session.id);

  if (!plan?.allowsOwnKeys) {
    const offer = await prisma.plan.findFirst({ where: { allowsOwnKeys: true, isActive: true }, select: { name: true, description: true } });
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Models</h2>
          <p className="text-sm text-muted-foreground">Run every tool on your own AI provider keys.</p>
        </div>
        {offer ? (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="text-lg font-bold text-foreground">{offer.name} plan</h3>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              {offer.description ?? "Add your own keys and use them across the tools."} Switching plans changes your daily limits straight away.
            </p>
            <ActivateOwnKeysPlan planName={offer.name} />
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">Bring-your-own-keys isn&apos;t available yet.</p>
        )}
      </div>
    );
  }

  const state = await getOwnModelsState(session.id);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">AI Models</h2>
        <p className="text-sm text-muted-foreground">Add your own provider keys and choose the order your tools try them in.</p>
      </div>
      <ModelsManager initial={state} />
    </div>
  );
}
