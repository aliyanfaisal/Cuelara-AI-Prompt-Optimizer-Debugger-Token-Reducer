"use server";

import { getSessionUser } from "@/lib/session-user";
import { createPersonalAccessToken } from "@/lib/personal-access-tokens";

type ConnectResult = { success: true; token: string } | { error: string };

/** Mints a token for the browser extension that is asking to be connected to the signed-in account. */
export async function connectExtensionAction(deviceLabel: string): Promise<ConnectResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Please sign in." };

  const label = deviceLabel.trim().slice(0, 50);
  const { token } = await createPersonalAccessToken(user.id, label ? `Extension · ${label}` : "Browser extension", "extension");
  return { success: true, token };
}
