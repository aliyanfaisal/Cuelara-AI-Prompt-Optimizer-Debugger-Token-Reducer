"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BarChart3, BookMarked, History, LayoutDashboard } from "lucide-react";
import type { TeamRole } from "@/lib/workspace";

export function TeamSidebar({ teamId, role }: { teamId: string; role: TeamRole }) {
  const pathname = usePathname();
  const base = `/team/${teamId}`;
  const canManage = role === "OWNER" || role === "ADMIN";

  const items = [
    { name: "Overview", href: base, icon: LayoutDashboard },
    { name: "Prompt Library", href: `${base}/library`, icon: BookMarked },
    { name: "Team Activity", href: `${base}/activity`, icon: History },
    ...(canManage ? [{ name: "Usage Analytics", href: `${base}/analytics`, icon: BarChart3 }] : []),
  ];

  return (
    <nav aria-label="Team dashboard" className="flex flex-col gap-1">
      <div className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
        {items.map(({ name, href, icon: Icon }) => {
          const active = href === base ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {name}
            </Link>
          );
        })}
      </div>
      <Link
        href="/dashboard"
        className="mt-4 flex items-center gap-2.5 rounded-xl border-t border-border px-3.5 pt-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground md:mt-6 md:pt-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my dashboard
      </Link>
    </nav>
  );
}
