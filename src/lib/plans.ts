import { prisma } from "@/lib/prisma";

const planSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceMonthlyCents: true,
  features: true,
  historyPerTool: true,
  limits: { select: { tool: true, dailyLimit: true } },
} as const;

/**
 * The plan that governs a signed-in user: their own active plan, or, when they have none (accounts created
 * before plans existed, or whose plan was deactivated or deleted), the plan marked as the default. So a user
 * with no plan is a Free user, with the Free plan's limits, rather than falling back to hard-coded numbers.
 * Null only if there is no default plan either.
 */
export async function getEffectivePlan(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: { select: { ...planSelect, isActive: true } } } });
  if (user?.plan?.isActive) return user.plan;
  return prisma.plan.findFirst({ where: { isDefault: true, isActive: true }, select: { ...planSelect, isActive: true } });
}
