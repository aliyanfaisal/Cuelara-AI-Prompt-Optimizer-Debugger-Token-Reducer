"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BookOpen, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { signOut } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Roles", href: "/admin/roles", icon: ShieldCheck },
  { name: "Prompts", href: "/admin/prompts", icon: FileText },
  { name: "Cookbook", href: "/admin/cookbook", icon: BookOpen },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`flex flex-col border-r border-border bg-card transition-all duration-300 relative h-screen sticky top-0 ${isCollapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">Cuelara Admin</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-5 bg-background border border-border rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-x-3 rounded-md p-2 text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${isCollapsed ? "justify-center" : ""}`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                aria-hidden="true"
              />
              {!isCollapsed && item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`group flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors ${isCollapsed ? "justify-center" : ""}`}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!isCollapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}
