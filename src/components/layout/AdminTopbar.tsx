"use client";

import { useSession } from "next-auth/react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { User } from "lucide-react";

export function AdminTopbar() {
  const { data: session } = useSession();

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div>
        {/* Placeholder for dynamic page title or breadcrumbs */}
        <h1 className="text-sm font-semibold text-foreground">Admin Workspace</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline-block font-medium text-foreground">
            {session?.user?.name || session?.user?.email || "Admin"}
          </span>
        </div>
        
        {/* We can re-use the ThemeSwitcher logic, but the global one in layout might be enough. 
            If we want one specifically in the topbar, we can add it here. For now, the global one works. */}
      </div>
    </header>
  );
}
