import { prisma } from "@/lib/prisma";
import SubscriberTable, { type SubscriberRow } from "./SubscriberTable";

export const metadata = {
  title: "Newsletter | Admin",
};

const ROW_LIMIT = 500;

export default async function NewsletterPage() {
  const [rows, total, active] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: ROW_LIMIT }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
  ]);

  const subscribers: SubscriberRow[] = rows.map((s) => ({
    id: s.id,
    email: s.email,
    source: s.source,
    isActive: !s.unsubscribedAt,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Newsletter</h1>
        <p className="text-muted-foreground">
          Everyone who signed up through the footer or the blog newsletter form.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Total signups</p>
          <p className="text-2xl font-bold text-foreground mt-1">{total.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Active subscribers</p>
          <p className="text-2xl font-bold text-foreground mt-1">{active.toLocaleString()}</p>
        </div>
      </div>

      <SubscriberTable initialSubscribers={subscribers} />
    </div>
  );
}
