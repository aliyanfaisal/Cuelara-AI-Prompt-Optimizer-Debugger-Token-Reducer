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
  limits: { select: { tool: true, dailyLimit: true, teamDailyLimit: true } },
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

/** The team workspaces this user belongs to, each with its manager's plan (only managers whose plan can still host a team). */
async function teamMemberships(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { type: "team" } },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true, workspace: { select: { user: { select: { plan: { select: { ...planSelect, isActive: true } } } } } } },
  });
  return memberships
    .map((m) => ({ workspaceId: m.workspaceId, plan: m.workspace.user.plan }))
    .filter((m): m is { workspaceId: string; plan: NonNullable<typeof m.plan> } => !!m.plan && m.plan.isActive && m.plan.maxSeats > 0);
}

/**
 * The plan that governs a signed-in user, plus the team it comes from when that is a team plan: their own plan, or —
 * if they belong to a team whose manager is on a plan that hosts teams — that team plan when it is at least as good
 * (a manager is a member of their own team, so on a tie the team wins and its shared pool applies). Being invited into
 * a team is how a member gets the Team plan's limits and multi-browser sign-in without paying for a seat themselves.
 */
export async function getPlanContext(userId: string) {
  const own = await getOwnPlan(userId);
  let plan = own;
  let team: { workspaceId: string } | null = null;
  for (const t of await teamMemberships(userId)) {
    if (!plan || t.plan.priceMonthlyCents >= plan.priceMonthlyCents) {
      plan = t.plan;
      team = { workspaceId: t.workspaceId };
    }
  }
  return { plan, team };
}

export async function getEffectivePlan(userId: string) {
  return (await getPlanContext(userId)).plan;
}
