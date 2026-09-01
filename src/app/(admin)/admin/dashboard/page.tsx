import { Users, FileText, BookOpen, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  // Fetch some quick stats
  const totalUsers = await prisma.user.count();
  const totalPrompts = await prisma.prompt.count();
  const totalCookbook = await prisma.cookbookPrompt.count();

  const stats = [
    { name: "Total Users", value: totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Saved Prompts", value: totalPrompts, icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10" },
    { name: "Cookbook Items", value: totalCookbook, icon: BookOpen, color: "text-orange-500", bg: "bg-orange-500/10" },
    { name: "System Status", value: "Healthy", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-2">Welcome to your Cuelara admin workspace.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="glass-card rounded-2xl p-6 transition-all hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Recent Users</h3>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Users className="w-8 h-8 mb-2 opacity-50" />
            <p>No recent users to display.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">System Activity</h3>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p>All systems operational.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
