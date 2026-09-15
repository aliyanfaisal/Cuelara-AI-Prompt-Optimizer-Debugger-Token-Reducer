"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY,
  CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY,
  CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY,
  CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY,
  CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY,
  PROMPT_OPTIMIZER_DAILY_LIMIT_KEY,
  PROMPT_OPTIMIZER_DAILY_LIMIT_AUTH_KEY,
  TOKEN_OPTIMIZER_DAILY_LIMIT_KEY,
  TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY,
} from "@/lib/tool-settings-keys";

const DEFAULTS = {
  maxFileMb: "5",
  documentDailyLimit: "2",
  promptDailyLimit: "50",
  documentDailyLimitAuth: "5",
  promptDailyLimitAuth: "100",
  promptOptimizerDailyLimit: "5",
  promptOptimizerDailyLimitAuth: "15",
  tokenOptimizerDailyLimit: "5",
  tokenOptimizerDailyLimitAuth: "15",
};

export async function getToolSettings() {
  try {
    const [maxFileMb, documentDailyLimit, promptDailyLimit, documentDailyLimitAuth, promptDailyLimitAuth, promptOptimizerDailyLimit, promptOptimizerDailyLimitAuth, tokenOptimizerDailyLimit, tokenOptimizerDailyLimitAuth] = await Promise.all([
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY } }),
      prisma.setting.findUnique({ where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY } }),
      prisma.setting.findUnique({ where: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_KEY } }),
      prisma.setting.findUnique({ where: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_AUTH_KEY } }),
      prisma.setting.findUnique({ where: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_KEY } }),
      prisma.setting.findUnique({ where: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY } }),
    ]);
    return {
      contextExtractorMaxFileMb: maxFileMb?.value || DEFAULTS.maxFileMb,
      contextExtractorDocumentDailyLimit: documentDailyLimit?.value || DEFAULTS.documentDailyLimit,
      contextExtractorPromptDailyLimit: promptDailyLimit?.value || DEFAULTS.promptDailyLimit,
      contextExtractorDocumentDailyLimitAuth: documentDailyLimitAuth?.value || DEFAULTS.documentDailyLimitAuth,
      contextExtractorPromptDailyLimitAuth: promptDailyLimitAuth?.value || DEFAULTS.promptDailyLimitAuth,
      promptOptimizerDailyLimit: promptOptimizerDailyLimit?.value || DEFAULTS.promptOptimizerDailyLimit,
      promptOptimizerDailyLimitAuth: promptOptimizerDailyLimitAuth?.value || DEFAULTS.promptOptimizerDailyLimitAuth,
      tokenOptimizerDailyLimit: tokenOptimizerDailyLimit?.value || DEFAULTS.tokenOptimizerDailyLimit,
      tokenOptimizerDailyLimitAuth: tokenOptimizerDailyLimitAuth?.value || DEFAULTS.tokenOptimizerDailyLimitAuth,
    };
  } catch (error) {
    return {
      contextExtractorMaxFileMb: DEFAULTS.maxFileMb,
      contextExtractorDocumentDailyLimit: DEFAULTS.documentDailyLimit,
      contextExtractorPromptDailyLimit: DEFAULTS.promptDailyLimit,
      contextExtractorDocumentDailyLimitAuth: DEFAULTS.documentDailyLimitAuth,
      contextExtractorPromptDailyLimitAuth: DEFAULTS.promptDailyLimitAuth,
      promptOptimizerDailyLimit: DEFAULTS.promptOptimizerDailyLimit,
      promptOptimizerDailyLimitAuth: DEFAULTS.promptOptimizerDailyLimitAuth,
      tokenOptimizerDailyLimit: DEFAULTS.tokenOptimizerDailyLimit,
      tokenOptimizerDailyLimitAuth: DEFAULTS.tokenOptimizerDailyLimitAuth,
    };
  }
}

export type ToolSettings = Awaited<ReturnType<typeof getToolSettings>>;

export async function updateToolSettings(data: {
  maxFileMb: string;
  documentDailyLimit: string;
  promptDailyLimit: string;
  documentDailyLimitAuth: string;
  promptDailyLimitAuth: string;
  promptOptimizerDailyLimit: string;
  promptOptimizerDailyLimitAuth: string;
  tokenOptimizerDailyLimit: string;
  tokenOptimizerDailyLimitAuth: string;
}) {
  const parsed = {
    maxFileMb: parseInt(data.maxFileMb, 10),
    documentDailyLimit: parseInt(data.documentDailyLimit, 10),
    promptDailyLimit: parseInt(data.promptDailyLimit, 10),
    documentDailyLimitAuth: parseInt(data.documentDailyLimitAuth, 10),
    promptDailyLimitAuth: parseInt(data.promptDailyLimitAuth, 10),
    promptOptimizerDailyLimit: parseInt(data.promptOptimizerDailyLimit, 10),
    promptOptimizerDailyLimitAuth: parseInt(data.promptOptimizerDailyLimitAuth, 10),
    tokenOptimizerDailyLimit: parseInt(data.tokenOptimizerDailyLimit, 10),
    tokenOptimizerDailyLimitAuth: parseInt(data.tokenOptimizerDailyLimitAuth, 10),
  };

  const labels: Record<keyof typeof parsed, string> = {
    maxFileMb: "Max file size",
    documentDailyLimit: "Documents per day (anonymous)",
    promptDailyLimit: "Prompts per day (anonymous)",
    documentDailyLimitAuth: "Documents per day (signed in)",
    promptDailyLimitAuth: "Prompts per day (signed in)",
    promptOptimizerDailyLimit: "Prompt Optimizer optimizations per day (anonymous)",
    promptOptimizerDailyLimitAuth: "Prompt Optimizer optimizations per day (signed in)",
    tokenOptimizerDailyLimit: "Token Optimizer compressions per day (anonymous)",
    tokenOptimizerDailyLimitAuth: "Token Optimizer compressions per day (signed in)",
  };

  for (const key of Object.keys(parsed) as (keyof typeof parsed)[]) {
    if (!Number.isFinite(parsed[key]) || parsed[key] <= 0) {
      return { error: `${labels[key]} must be a positive number.` };
    }
  }

  try {
    await Promise.all([
      prisma.setting.upsert({
        where: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY },
        update: { value: String(parsed.maxFileMb) },
        create: { key: CONTEXT_EXTRACTOR_MAX_FILE_MB_KEY, value: String(parsed.maxFileMb) },
      }),
      prisma.setting.upsert({
        where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY },
        update: { value: String(parsed.documentDailyLimit) },
        create: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_KEY, value: String(parsed.documentDailyLimit) },
      }),
      prisma.setting.upsert({
        where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY },
        update: { value: String(parsed.promptDailyLimit) },
        create: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_KEY, value: String(parsed.promptDailyLimit) },
      }),
      prisma.setting.upsert({
        where: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY },
        update: { value: String(parsed.documentDailyLimitAuth) },
        create: { key: CONTEXT_EXTRACTOR_DOCUMENT_DAILY_LIMIT_AUTH_KEY, value: String(parsed.documentDailyLimitAuth) },
      }),
      prisma.setting.upsert({
        where: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY },
        update: { value: String(parsed.promptDailyLimitAuth) },
        create: { key: CONTEXT_EXTRACTOR_PROMPT_DAILY_LIMIT_AUTH_KEY, value: String(parsed.promptDailyLimitAuth) },
      }),
      prisma.setting.upsert({
        where: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_KEY },
        update: { value: String(parsed.promptOptimizerDailyLimit) },
        create: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_KEY, value: String(parsed.promptOptimizerDailyLimit) },
      }),
      prisma.setting.upsert({
        where: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_AUTH_KEY },
        update: { value: String(parsed.promptOptimizerDailyLimitAuth) },
        create: { key: PROMPT_OPTIMIZER_DAILY_LIMIT_AUTH_KEY, value: String(parsed.promptOptimizerDailyLimitAuth) },
      }),
      prisma.setting.upsert({
        where: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_KEY },
        update: { value: String(parsed.tokenOptimizerDailyLimit) },
        create: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_KEY, value: String(parsed.tokenOptimizerDailyLimit) },
      }),
      prisma.setting.upsert({
        where: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY },
        update: { value: String(parsed.tokenOptimizerDailyLimitAuth) },
        create: { key: TOKEN_OPTIMIZER_DAILY_LIMIT_AUTH_KEY, value: String(parsed.tokenOptimizerDailyLimitAuth) },
      }),
    ]);
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update settings." };
  }
}
