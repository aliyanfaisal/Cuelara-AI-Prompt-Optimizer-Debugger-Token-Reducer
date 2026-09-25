import { prisma } from "@/lib/prisma";

const planSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceMonthlyCents: true,
  features: true,
  historyPerTool: true,
  allowsOwnKeys: true,
  allowsMultipleSessions: true,
  maxSeats: true,
  limits: { select: { tool: true, dailyLimit: true } },
} as const;

/**
 * The plan a user has on their own: their assigned active plan, or, when they have none (accounts created
 * before plans existed, or whose plan was deactivated or deleted), the plan marked as the default. So a user
 * with no plan is a Free user, with the Free plan's limits, rather than falling back to hard-coded numbers.
 * Null only if there is no default plan either.
 */
export async function getOwnPlan(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: { select: { ...planSelect, isActive: true } } } });
  if (user?.plan?.isActive) return user.plan;
  return prisma.plan.findFirst({ where: { isDefault: true, isActive: true }, select: { ...planSelect, isActive: true } });
}

/** The plans of the managers of every team workspace this user belongs to (only managers whose plan can still host a team). */
async function teamPlans(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { type: "team" } },
    select: { workspace: { select: { user: { select: { plan: { select: { ...planSelect, isActive: true } } } } } } },
  });
  return memberships.map((m) => m.workspace.user.plan).filter((p): p is NonNullable<typeof p> => !!p && p.isActive && p.maxSeats > 0);
}

/**
 * The plan that governs a signed-in user: their own plan, or — if they belong to a team whose manager is on a
 * plan that hosts teams — that team plan when it is the better (higher-priced) one. Being invited into a team is
 * how a member gets the Team plan's limits and multi-browser sign-in without paying for a seat themselves.
 */
export async function getEffectivePlan(userId: string) {
  const own = await getOwnPlan(userId);
  const shared = await teamPlans(userId);
  let best = own;
  for (const plan of shared) {
    if (!best || plan.priceMonthlyCents > best.priceMonthlyCents) best = plan;
  }
  return best;
}
