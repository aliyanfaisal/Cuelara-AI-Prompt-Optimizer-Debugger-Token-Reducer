import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { DashboardNav } from "./DashboardNav";

// Everything here is per-user, so it is never prerendered or indexed.
export const dynamic = "force-dynamic";
// A title object (not a string) keeps the "%s | Cuelara" template working for the pages below.
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard | Cuelara" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?callbackUrl=/dashboard");

  // The JWT can outlive the account (deleted or deactivated), so confirm the user still exists.
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true, email: true, isActive: true } });
  if (!user || !user.isActive) redirect("/login?error=Unauthorized+Access");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-28 md:pt-32">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">{user.name || user.email}</h1>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <DashboardNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
