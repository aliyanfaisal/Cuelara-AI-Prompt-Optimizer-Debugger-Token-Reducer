"use client";

import { useEffect } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";

// A newer login on another browser replaces this one (see src/lib/auth.ts). The session endpoint then
// reports an error, and this signs the browser out and explains why on the login page.
function SessionReplacedWatcher() {
  const { data } = useSession();
  const replaced = (data as { error?: string } | null)?.error === "SessionReplaced";

  useEffect(() => {
    if (replaced) signOut({ callbackUrl: "/login?error=SessionReplaced" });
  }, [replaced]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus>
      <SessionReplacedWatcher />
      {children}
    </SessionProvider>
  );
}
