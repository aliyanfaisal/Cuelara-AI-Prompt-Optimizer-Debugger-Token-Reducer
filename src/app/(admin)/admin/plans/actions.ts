"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isPlanToolId } from "@/lib/plan-tools";

export interface PlanLimitInput {
  tool: string;
  dailyLimit: number;
}

export interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthlyCents: number;
  isDefault: boolean;
  isActive: boolean;
  features: string;
  isFeatured: boolean;
  allowsOwnKeys: boolean;
  allowsMultipleSessions: boolean;
  historyPerTool: number;
  createdAt: string;
  userCount: number;
  limits: { tool: string; dailyLimit: number }[];
}

export async function getPlans(): Promise<PlanRow[]> {
  const plans = await prisma.plan.findMany({
    orderBy: { priceMonthlyCents: "asc" },
    include: { limits: true, _count: { select: { users: true } } },
  });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceMonthlyCents: p.priceMonthlyCents,
    isDefault: p.isDefault,
    isActive: p.isActive,
    features: p.features ?? "",
    isFeatured: p.isFeatured,
    allowsOwnKeys: p.allowsOwnKeys,
    allowsMultipleSessions: p.allowsMultipleSessions,
    historyPerTool: p.historyPerTool,
    createdAt: p.createdAt.toISOString(),
    userCount: p._count.users,
    limits: p.limits.map((l) => ({ tool: l.tool, dailyLimit: l.dailyLimit })),
  }));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function validateLimits(limits: PlanLimitInput[]): { error?: string; clean?: PlanLimitInput[] } {
  const clean: PlanLimitInput[] = [];
  for (const l of limits) {
    if (!isPlanToolId(l.tool)) return { error: `Unknown tool: ${l.tool}` };
    if (!Number.isFinite(l.dailyLimit) || l.dailyLimit <= 0) continue; // 0/blank = "no override for this tool"
    clean.push({ tool: l.tool, dailyLimit: Math.floor(l.dailyLimit) });
  }
  return { clean };
}

export async function createPlan(data: {
  name: string;
  description: string;
  priceMonthlyCents: number;
  isDefault: boolean;
  isActive: boolean;
  features: string;
  isFeatured: boolean;
  allowsOwnKeys: boolean;
  allowsMultipleSessions: boolean;
  historyPerTool: number;
  limits: PlanLimitInput[];
}) {
  const name = data.name.trim();
  if (!name) return { error: "Plan name is required." };
  if (!Number.isFinite(data.priceMonthlyCents) || data.priceMonthlyCents < 0) {
    return { error: "Monthly price must be a non-negative number." };
  }
  if (!Number.isInteger(data.historyPerTool) || data.historyPerTool < 1 || data.historyPerTool > 1000) {
    return { error: "History per tool must be a whole number from 1 to 1000." };
  }
  const { error, clean } = validateLimits(data.limits);
  if (error) return { error };

  const slug = slugify(name);
  try {
    await prisma.$transaction(async (tx) => {
      // Only one plan can be "default" (auto-assigned to new signups) at a time.
      if (data.isDefault) await tx.plan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });

      await tx.plan.create({
        data: {
          name,
          slug,
          description: data.description.trim() || null,
          priceMonthlyCents: Math.round(data.priceMonthlyCents),
          isDefault: data.isDefault,
          isActive: data.isActive,
          features: data.features.trim() || null,
          isFeatured: data.isFeatured,
          allowsOwnKeys: data.allowsOwnKeys,
          allowsMultipleSessions: data.allowsMultipleSessions,
          historyPerTool: Math.floor(data.historyPerTool),
          limits: { create: clean },
        },
      });
    });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "A plan with this name already exists." };
    }
    return { error: "Failed to create plan." };
  }
}

export async function updatePlan(
  id: string,
  data: {
    name: string;
    description: string;
    priceMonthlyCents: number;
    isDefault: boolean;
    isActive: boolean;
    features: string;
    isFeatured: boolean;
    allowsOwnKeys: boolean;
    allowsMultipleSessions: boolean;
    historyPerTool: number;
    limits: PlanLimitInput[];
  }
) {
  const name = data.name.trim();
  if (!name) return { error: "Plan name is required." };
  if (!Number.isFinite(data.priceMonthlyCents) || data.priceMonthlyCents < 0) {
    return { error: "Monthly price must be a non-negative number." };
  }
  if (!Number.isInteger(data.historyPerTool) || data.historyPerTool < 1 || data.historyPerTool > 1000) {
    return { error: "History per tool must be a whole number from 1 to 1000." };
  }
  const { error, clean } = validateLimits(data.limits);
  if (error) return { error };

  try {
    await prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.plan.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });

      await tx.plan.update({
        where: { id },
        data: {
          name,
          description: data.description.trim() || null,
          priceMonthlyCents: Math.round(data.priceMonthlyCents),
          isDefault: data.isDefault,
          isActive: data.isActive,
          features: data.features.trim() || null,
          isFeatured: data.isFeatured,
          allowsOwnKeys: data.allowsOwnKeys,
          allowsMultipleSessions: data.allowsMultipleSessions,
          historyPerTool: Math.floor(data.historyPerTool),
        },
      });
      // Simplest consistent way to sync the limit set: replace it wholesale.
      await tx.planToolLimit.deleteMany({ where: { planId: id } });
      if (clean && clean.length > 0) {
        await tx.planToolLimit.createMany({ data: clean!.map((l) => ({ planId: id, tool: l.tool, dailyLimit: l.dailyLimit })) });
      }
    });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    return { success: true };
  } catch {
    return { error: "Failed to update plan." };
  }
}

// Deleting a plan clears planId on any user assigned to it (falls back to the tool's
// normal authenticated default) — it does not fail just because users are on it.
export async function deletePlan(id: string) {
  try {
    await prisma.plan.delete({ where: { id } });
    revalidatePath("/admin/plans");
    revalidatePath("/pricing");
    return { success: true };
  } catch {
    return { error: "Failed to delete plan." };
  }
}
