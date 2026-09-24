import "server-only";
import { prisma } from "@/lib/prisma";
import { OPENROUTER_MODEL_MODE_KEY } from "@/lib/tool-settings-keys";

export const OPENROUTER_MODEL_MODES = ["free", "paid"] as const;
export type OpenRouterModelMode = (typeof OPENROUTER_MODEL_MODES)[number];

// "paid" isn't wired to any model selection yet (see openrouter-free-models.ts) — the
// setting exists so the admin UI can be built now, but resolving still returns "free"
// until a specific paid model is chosen to avoid unexpected spend.
export async function getOpenRouterModelMode(): Promise<OpenRouterModelMode> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: OPENROUTER_MODEL_MODE_KEY } });
    return row?.value === "paid" ? "paid" : "free";
  } catch {
    return "free";
  }
}

export async function setOpenRouterModelMode(mode: OpenRouterModelMode): Promise<void> {
  await prisma.setting.upsert({
    where: { key: OPENROUTER_MODEL_MODE_KEY },
    update: { value: mode },
    create: { key: OPENROUTER_MODEL_MODE_KEY, value: mode },
  });
}
