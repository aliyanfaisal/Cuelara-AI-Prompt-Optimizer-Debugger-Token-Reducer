import { prisma } from "@/lib/prisma";
import UserManager from "./UserManager";

export const metadata = {
  title: "Users Management | Admin",
};

export default async function UsersPage() {
  const [users, roles, plans] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        roles: true,
        plan: true,
        _count: {
          select: { prompts: true, workspaces: true }
        }
      }
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyCents: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Users Management</h1>
          <p className="text-muted-foreground">Manage user accounts, statuses, roles, and subscription plans.</p>
        </div>
      </div>

      <UserManager initialUsers={users} availableRoles={roles} availablePlans={plans} />
    </div>
  );
}
