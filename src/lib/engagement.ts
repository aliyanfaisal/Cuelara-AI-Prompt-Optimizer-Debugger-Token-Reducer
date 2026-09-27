import "server-only";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActionIp } from "@/lib/abuse-limit";
import type { EngagementSubject, ReactionType } from "@/generated/client/client";
import { type ReactionCounts, type ReactionSummary } from "@/lib/reactions";

export type { ReactionCounts, ReactionSummary };

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Identifies the current visitor for engagement dedup: a signed-in user's id, else their hashed IP. */
export async function visitorKey(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (userId) return `user:${userId}`;
  return `ip:${hashIp(await getActionIp())}`;
}

/**
 * Records one view for this visitor, at most once per subject per day, and returns the
 * up-to-date view count. Call from the page itself (it is already force-dynamic).
 */
export async function recordView(subject: EngagementSubject, subjectId: string): Promise<number> {
  const subjectKey = await visitorKey();
  try {
    await prisma.contentView.create({ data: { subject, subjectId, subjectKey, date: todayUtc() } });
  } catch {
    // Unique constraint hit: this visitor already has a view logged for today, don't count another.
    return currentViews(subject, subjectId);
  }

  if (subject === "blog") {
    const updated = await prisma.blogPost.update({ where: { id: subjectId }, data: { views: { increment: 1 } }, select: { views: true } });
    return updated.views;
  }
  const updated = await prisma.cookbookPrompt.update({ where: { id: subjectId }, data: { views: { increment: 1 } }, select: { views: true } });
  return updated.views;
}

async function currentViews(subject: EngagementSubject, subjectId: string): Promise<number> {
  if (subject === "blog") {
    const row = await prisma.blogPost.findUnique({ where: { id: subjectId }, select: { views: true } });
    return row?.views ?? 0;
  }
  const row = await prisma.cookbookPrompt.findUnique({ where: { id: subjectId }, select: { views: true } });
  return row?.views ?? 0;
}

function emptyCounts(): ReactionCounts {
  return { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
}

/** Per-type counts plus this visitor's own reaction (if any), for a subject's reaction bar. */
export async function getReactionSummary(subject: EngagementSubject, subjectId: string): Promise<ReactionSummary> {
  const subjectKey = await visitorKey();
  const [grouped, mine] = await Promise.all([
    prisma.reaction.groupBy({ by: ["type"], where: { subject, subjectId }, _count: { _all: true } }),
    prisma.reaction.findUnique({ where: { subject_subjectId_subjectKey: { subject, subjectId, subjectKey } }, select: { type: true } }),
  ]);

  const counts = emptyCounts();
  let total = 0;
  for (const g of grouped) {
    counts[g.type] = g._count._all;
    total += g._count._all;
  }
  return { counts, total, mine: mine?.type ?? null };
}

/** Sets, switches, or (given the same type again) clears the visitor's reaction. Returns the fresh summary. */
export async function setReaction(subject: EngagementSubject, subjectId: string, type: ReactionType | null): Promise<ReactionSummary> {
  const subjectKey = await visitorKey();
  const where = { subject_subjectId_subjectKey: { subject, subjectId, subjectKey } };

  if (type === null) {
    await prisma.reaction.deleteMany({ where: { subject, subjectId, subjectKey } });
  } else {
    await prisma.reaction.upsert({ where, create: { subject, subjectId, subjectKey, type }, update: { type } });
  }
  return getReactionSummary(subject, subjectId);
}
