import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyLimit(settingKey: string, fallback: number): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: settingKey } });
  const parsed = setting?.value ? parseInt(setting.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getUsedToday(ip: string, tool: string): Promise<number> {
  const existing = await prisma.toolUsageDaily.findUnique({
    where: { ipHash_tool_date: { ipHash: hashIp(ip), tool, date: todayUtc() } },
  });
  return existing?.count ?? 0;
}

/** Read-only check — call before doing any paid work, to reject early. */
export async function hasReachedDailyLimit(ip: string, tool: string, limit: number): Promise<boolean> {
  const used = await getUsedToday(ip, tool);
  return used >= limit;
}

/** Call only once the costly work (the Gemini call) has actually happened. */
export async function consumeDailyLimit(ip: string, tool: string): Promise<void> {
  const ipHash = hashIp(ip);
  const date = todayUtc();
  await prisma.toolUsageDaily.upsert({
    where: { ipHash_tool_date: { ipHash, tool, date } },
    create: { ipHash, tool, date, count: 1 },
    update: { count: { increment: 1 } },
  });
}

export { hashIp };
