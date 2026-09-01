import { prisma } from "@/lib/prisma";
import RoleManager from "./RoleManager";

export const metadata = {
  title: "Roles Management | Admin",
};

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Roles Management</h1>
          <p className="text-muted-foreground">Create and manage access roles for the platform.</p>
        </div>
      </div>

      <RoleManager initialRoles={roles} />
    </div>
  );
}
