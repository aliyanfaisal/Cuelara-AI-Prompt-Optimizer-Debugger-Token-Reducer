import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** True only for a live session whose user has the ADMIN role (a session replaced by a newer login carries no roles). */
export async function isAdminSession(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.includes("ADMIN");
}

/**
 * First line of every admin server action. The middleware only guards the /admin *pages*; a server action is a
 * public POST endpoint anyone can call directly, so each one has to check the role itself.
 */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdminSession())) throw new Error("Unauthorized");
}
