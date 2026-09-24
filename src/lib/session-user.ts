import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** The signed-in user's id and roles from the session, or null if nobody is signed in. */
export async function getSessionUser(): Promise<{ id: string; roles: string[] } | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; roles?: string[] } | undefined;
  return user?.id ? { id: user.id, roles: user.roles ?? [] } : null;
}
