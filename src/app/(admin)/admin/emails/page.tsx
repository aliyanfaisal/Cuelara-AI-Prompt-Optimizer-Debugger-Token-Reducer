import { prisma } from "@/lib/prisma";
import { EMAIL_TYPES } from "@/lib/email";
import EmailLogTable, { type EmailLogRow } from "./EmailLogTable";

export const metadata = {
  title: "Emails | Admin",
};

const LOOKBACK_DAYS = 30;
const ROW_LIMIT = 200;

async function getEmailStats() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [rows, total, failed] = await Promise.all([
    prisma.emailLog.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: ROW_LIMIT }),
    prisma.emailLog.count({ where: { createdAt: { gte: since } } }),
    prisma.emailLog.count({ where: { createdAt: { gte: since }, success: false } }),
  ]);

  const logs: EmailLogRow[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    to: r.to,
    subject: r.subject,
    success: r.success,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt.toISOString(),
  }));

  return { logs, total, failed };
}

export default async function EmailsPage() {
  const { logs, total, failed } = await getEmailStats();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Emails</h1>
        <p className="text-muted-foreground">
          Every account email (activation, password reset, plan change) sent over SMTP in the last {LOOKBACK_DAYS} days —
          shows exactly what went out and whether it actually delivered to your mail server.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Total sends</p>
          <p className="text-2xl font-bold text-foreground mt-1">{total.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-foreground mt-1">{failed.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm font-medium text-muted-foreground">Success rate</p>
          <p className="text-2xl font-bold text-foreground mt-1">{total > 0 ? Math.round(((total - failed) / total) * 100) : 100}%</p>
        </div>
      </div>

      <EmailLogTable logs={logs} types={[...EMAIL_TYPES]} />
    </div>
  );
}
