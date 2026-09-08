"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY,
  CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY,
  CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULTS = {
  maxFileMb: "5",
  documentDailyLimit: "2",
  promptDailyLimit: "50",
};

export async function getToolSettings() {
  try {
    const [maxFileMb, documentDailyLimit, promptDailyLimit] = await Promise.all([
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY } }),
    ]);
    return {
      contextExtractorMaxFileMb: maxFileMb?.value || DEFAULTS.maxFileMb,
      contextExtractorDocumentDailyLimit: documentDailyLimit?.value || DEFAULTS.documentDailyLimit,
      contextExtractorPromptDailyLimit: promptDailyLimit?.value || DEFAULTS.promptDailyLimit,
    };
  } catch (error) {
    return {
      contextExtractorMaxFileMb: DEFAULTS.maxFileMb,
      contextExtractorDocumentDailyLimit: DEFAULTS.documentDailyLimit,
      contextExtractorPromptDailyLimit: DEFAULTS.promptDailyLimit,
    };
  }
}

export async function updateToolSettings(data: { maxFileMb: string; documentDailyLimit: string; promptDailyLimit: string }) {
  const maxFileMb = parseInt(data.maxFileMb, 10);
  const documentDailyLimit = parseInt(data.documentDailyLimit, 10);
  const promptDailyLimit = parseInt(data.promptDailyLimit, 10);

  if (!Number.isFinite(maxFileMb) || maxFileMb <= 0) {
    return { error: "Max file size must be a positive number." };
  }
  if (!Number.isFinite(documentDailyLimit) || documentDailyLimit <= 0) {
    return { error: "Documents per day must be a positive number." };
  }
  if (!Number.isFinite(promptDailyLimit) || promptDailyLimit <= 0) {
    return { error: "Prompts per day must be a positive number." };
  }

  try {
    await prisma.setting.upsert({
      where: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY },
      update: { value: String(maxFileMb) },
      create: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY, value: String(maxFileMb) },
    });
    await prisma.setting.upsert({
      where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY },
      update: { value: String(documentDailyLimit) },
      create: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, value: String(documentDailyLimit) },
    });
    await prisma.setting.upsert({
      where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY },
      update: { value: String(promptDailyLimit) },
      create: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, value: String(promptDailyLimit) },
    });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update settings." };
  }
}
