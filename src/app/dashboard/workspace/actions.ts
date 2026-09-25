"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session-user";
import * as lib from "@/lib/workspace";

type Result = { success: true; id?: string } | { error: string };

const UNAUTHORIZED: Result = { error: "Please sign in again." };

export async function createSavedPrompt(workspaceId: string, input: { title: string; content: string; tags: string[] }): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await lib.savePrompt(me.id, workspaceId, input);
  revalidatePath("/dashboard/workspace");
  return r.ok ? { success: true, id: r.id } : { error: r.error };
}

export async function updateSavedPrompt(promptId: string, input: { title: string; content: string; tags: string[] }): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await lib.updatePrompt(me.id, promptId, input);
  revalidatePath("/dashboard/workspace");
  return r.ok ? { success: true } : { error: r.error };
}

export async function deleteSavedPrompt(promptId: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return UNAUTHORIZED;
  const r = await lib.deletePrompt(me.id, promptId);
  revalidatePath("/dashboard/workspace");
  return r.ok ? { success: true } : { error: r.error };
}
