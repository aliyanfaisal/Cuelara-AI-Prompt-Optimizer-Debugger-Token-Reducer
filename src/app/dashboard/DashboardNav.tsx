"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, History, LayoutDashboard, User, Wallet } from "lucide-react";

const ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tool History", href: "/dashboard/tools", icon: History },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard },
  { name: "Payment Methods", href: "/dashboard/payment-methods", icon: Wallet },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
      {ITEMS.map(({ name, href, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
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
    </nav>
  );
}
