import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeDomain, type SiteRuleMode } from "@/lib/extension/domain";

export interface SiteRule {
  domain: string;
  mode: SiteRuleMode;
}

export async function listSiteRules(userId: string): Promise<SiteRule[]> {
  const rows = await prisma.extensionSiteRule.findMany({ where: { userId }, orderBy: { domain: "asc" }, select: { domain: true, mode: true } });
  return rows.map((r) => ({ domain: r.domain, mode: r.mode === "allow" ? "allow" : "block" }));
}

/** One rule per domain: setting "block" over an existing "allow" (or the reverse) replaces it. */
export async function setSiteRule(userId: string, domain: string, mode: SiteRuleMode): Promise<void> {
  await prisma.extensionSiteRule.upsert({
    where: { userId_domain: { userId, domain } },
    create: { userId, domain, mode },
    update: { mode },
  });
}

export async function removeSiteRule(userId: string, domain: string): Promise<void> {
  await prisma.extensionSiteRule.deleteMany({ where: { userId, domain } });
}

/**
 * Adds rules a browser collected while signed out (or offline). A domain the account already has a rule for keeps the
 * account's choice, so connecting a second browser never overrides what the user set elsewhere.
 */
export async function mergeSiteRules(userId: string, incoming: { domain: unknown; mode: unknown }[]): Promise<SiteRule[]> {
  const existing = new Set((await listSiteRules(userId)).map((r) => r.domain));
  const fresh = new Map<string, SiteRuleMode>();
  for (const rule of incoming.slice(0, 500)) {
    const domain = typeof rule.domain === "string" ? normalizeDomain(rule.domain) : null;
    if (!domain || existing.has(domain) || (rule.mode !== "block" && rule.mode !== "allow")) continue;
    fresh.set(domain, rule.mode);
  }
  if (fresh.size > 0) {
    await prisma.extensionSiteRule.createMany({
      data: [...fresh].map(([domain, mode]) => ({ userId, domain, mode })),
      skipDuplicates: true,
    });
  }
  return listSiteRules(userId);
}
