import { prisma } from "@/lib/prisma";
import ErrorTable, { type ErrorRow } from "./ErrorTable";

export const metadata = { title: "Errors | Admin" };
export const dynamic = "force-dynamic";

const ROW_LIMIT = 200;

export default async function ErrorsPage() {
  const [rows, unresolved] = await Promise.all([
    prisma.errorLog.findMany({ orderBy: [{ resolved: "asc" }, { lastSeenAt: "desc" }], take: ROW_LIMIT }),
    prisma.errorLog.count({ where: { resolved: false } }),
  ]);

  const errors: ErrorRow[] = rows.map((r) => ({
    id: r.id,
    source: r.source,
    message: r.message,
    stack: r.stack,
    route: r.route,
    count: r.count,
    resolved: r.resolved,
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Errors</h1>
        <p className="text-muted-foreground">
          Unexpected failures from the server and visitors&rsquo; browsers, grouped so the same problem is one row. A new kind of error also emails you.
          {unresolved > 0 ? ` ${unresolved} unresolved.` : " Nothing unresolved."}
        </p>
      </div>
      <ErrorTable errors={errors} />
    </div>
  );
}
