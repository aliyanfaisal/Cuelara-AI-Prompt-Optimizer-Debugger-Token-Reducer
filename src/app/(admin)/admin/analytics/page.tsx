import { getApiCallStats } from "./actions";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const metadata = {
  title: "Analytics | Admin",
};

// Traffic is logged continuously by tool routes elsewhere, not through this
// page's own actions — nothing calls revalidatePath("/admin/analytics"), so a
// statically-cached shell would freeze on whatever counts existed at build time.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const stats = await getApiCallStats("day");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">API Usage & Failures</h1>
        <p className="text-muted-foreground">Model traffic across the key rotation pool, and every failed call along the way.</p>
      </div>

      <AnalyticsDashboard initialStats={stats} />
    </div>
  );
}
