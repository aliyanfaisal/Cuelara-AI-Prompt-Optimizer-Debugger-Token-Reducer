"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session-user";
import { createPersonalAccessToken, revokePersonalAccessToken } from "@/lib/personal-access-tokens";

type CreateResult = { success: true; token: string } | { error: string };
type RevokeResult = { success: true } | { error: string };

export async function createMcpTokenAction(label: string): Promise<CreateResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };

  const { token } = await createPersonalAccessToken(user.id, label);
  revalidatePath("/dashboard/mcp");
  return { success: true, token };
}

export async function revokeMcpTokenAction(id: string): Promise<RevokeResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };

  const revoked = await revokePersonalAccessToken(id, user.id);
  if (!revoked) return { error: "That token no longer exists." };

  revalidatePath("/dashboard/mcp");
  return { success: true };
}
