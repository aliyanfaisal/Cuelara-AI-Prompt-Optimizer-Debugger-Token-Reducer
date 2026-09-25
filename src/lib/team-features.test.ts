import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let rl: typeof import("./rate-limit");
let hist: typeof import("./team-history");
let analytics: typeof import("./team-analytics");

let workspaceId: string;
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  rl = await import("./rate-limit");
  hist = await import("./team-history");
  analytics = await import("./team-analytics");

  const free = await db.plan.create({ data: { name: "Free", slug: "free", isDefault: true, limits: { create: [{ tool: "prompt-optimizer", dailyLimit: 15 }] } } });
  const team = await db.plan.create({
    data: { name: "Team", slug: "team", priceMonthlyCents: 3900, maxSeats: 5, limits: { create: [{ tool: "prompt-optimizer", dailyLimit: 500, teamDailyLimit: 3 }, { tool: "token-optimizer", dailyLimit: 500 }] } },
  });
  await db.user.create({ data: { id: "owner", email: "owner@x.com", name: "Olive", planId: team.id } });
  for (const id of ["ann", "bob", "cy", "solo"]) await db.user.create({ data: { id, email: `${id}@x.com`, name: id, planId: free.id } });

  workspaceId = (await db.workspace.create({ data: { name: "Acme", type: "team", userId: "owner" } })).id;
  // ann and bob joined 5 days ago, cy joined today; the owner has been in since the start.
  await db.workspaceMember.createMany({
    data: [
      { workspaceId, userId: "owner", role: "OWNER", createdAt: daysAgo(30) },
      { workspaceId, userId: "ann", role: "MEMBER", createdAt: daysAgo(5) },
      { workspaceId, userId: "bob", role: "MEMBER", createdAt: daysAgo(5) },
      { workspaceId, userId: "cy", role: "MEMBER" },
    ],
  });
});

after(async () => {
  await closeDb();
});

describe("shared team pool", () => {
  it("gives team members a pool, and individuals none", async () => {
    const ann = await rl.subjectForUser("ann");
    assert.deepEqual(ann.teamPool, { workspaceId, limits: { "prompt-optimizer": 3 } });
    assert.equal((await rl.subjectForUser("owner")).teamPool?.workspaceId, workspaceId);
    assert.equal((await rl.subjectForUser("solo")).teamPool, null);
  });

  it("caps a member at what the whole team has left, counting everyone's runs", async () => {
    const ann = await rl.subjectForUser("ann");
    const bob = await rl.subjectForUser("bob");
    assert.equal(await rl.resolvePlanLimit(ann, "prompt-optimizer", 15), 3);

    await rl.consumeDailyLimit(ann.subjectKey, "prompt-optimizer");
    await rl.consumeDailyLimit(ann.subjectKey, "prompt-optimizer");
    // ann used 2, pool has 1 left: ann's limit today is 3 (2 used + 1 left) …
    assert.equal(await rl.resolvePlanLimit(ann, "prompt-optimizer", 15), 3);
    // … and bob, who used none, can only do the 1 that's left.
    assert.equal(await rl.resolvePlanLimit(bob, "prompt-optimizer", 15), 1);

    await rl.consumeDailyLimit(bob.subjectKey, "prompt-optimizer");
    assert.equal(await rl.hasReachedDailyLimit(bob.subjectKey, "prompt-optimizer", await rl.resolvePlanLimit(bob, "prompt-optimizer", 15)), true);
    assert.equal(await rl.hasReachedDailyLimit(ann.subjectKey, "prompt-optimizer", await rl.resolvePlanLimit(ann, "prompt-optimizer", 15)), true);
  });

  it("records every run on both the member's and the team's counters", async () => {
    const pool = await db.toolUsageDaily.findFirstOrThrow({ where: { subjectKey: rl.teamPoolKey(workspaceId), tool: "prompt-optimizer", date: today() } });
    assert.equal(pool.count, 3);
    assert.equal((await db.toolUsageDaily.findFirstOrThrow({ where: { subjectKey: "user:ann", tool: "prompt-optimizer", date: today() } })).count, 2);
  });

  it("leaves tools without a pool, and individuals, untouched", async () => {
    const cy = await rl.subjectForUser("cy");
    assert.equal(await rl.resolvePlanLimit(cy, "token-optimizer", 15), 500);
    await rl.consumeDailyLimit(cy.subjectKey, "token-optimizer");
    assert.equal(await db.toolUsageDaily.count({ where: { subjectKey: rl.teamPoolKey(workspaceId), tool: "token-optimizer" } }), 0);

    const solo = await rl.subjectForUser("solo");
    assert.equal(await rl.resolvePlanLimit(solo, "prompt-optimizer", 99), 15);
    const anon = { subjectKey: "ip:abc", isAuthenticated: false, userId: null, planLimits: null, teamPool: null };
    assert.equal(await rl.resolvePlanLimit(anon, "prompt-optimizer", 5), 5);
  });

  it("reports pool usage for the team page", async () => {
    const pool = await analytics.getPoolToday(workspaceId);
    assert.deepEqual(pool, [{ tool: "prompt-optimizer", label: "Prompt Optimizer", used: 3, limit: 3 }]);
  });
});

describe("shared tool history", () => {
  const run = (userId: string, title: string, createdAt: Date, tool = "prompt-optimizer") =>
    db.toolRun.create({ data: { userId, tool, title, input: { rawInput: title }, result: { optimizedPrompt: "r" }, createdAt, updatedAt: createdAt } });
  let annRun: string;
  let annOldRun: string;
  let bobRun: string;

  before(async () => {
    annRun = (await run("ann", "ann recent", daysAgo(1))).id;
    annOldRun = (await run("ann", "ann before joining", daysAgo(20))).id;
    bobRun = (await run("bob", "bob recent", daysAgo(2), "token-optimizer")).id;
    await run("solo", "solo private", daysAgo(1));
  });

  it("lists members' runs from the day they joined, and never outsiders' or pre-join runs", async () => {
    const page = (await hist.listTeamRuns("cy", workspaceId, { skip: 0, take: 20 }))!;
    const titles = page.runs.map((r) => r.title).sort();
    assert.deepEqual(titles, ["ann recent", "bob recent"]);
    assert.ok(!titles.includes("ann before joining") && !titles.includes("solo private"));
  });

  it("filters by tool and member", async () => {
    assert.deepEqual((await hist.listTeamRuns("cy", workspaceId, { tool: "token-optimizer", skip: 0, take: 20 }))!.runs.map((r) => r.title), ["bob recent"]);
    assert.deepEqual((await hist.listTeamRuns("cy", workspaceId, { memberId: "ann", skip: 0, take: 20 }))!.runs.map((r) => r.title), ["ann recent"]);
  });

  it("is invisible to non-members", async () => {
    assert.equal(await hist.listTeamRuns("solo", workspaceId, { skip: 0, take: 20 }), null);
    assert.equal(await hist.getRunForViewer(annRun, "solo"), null);
  });

  it("lets teammates open a shared run (and the owner of the run open their own)", async () => {
    assert.equal((await hist.getRunForViewer(annRun, "cy"))?.title, "ann recent");
    assert.equal((await hist.getRunForViewer(annOldRun, "ann"))?.title, "ann before joining");
    assert.equal(await hist.getRunForViewer(annOldRun, "cy"), null); // from before ann joined
  });

  it("respects a member opting out, and the owner switching the whole feature off", async () => {
    assert.ok((await hist.setMemberShareHistory("bob", workspaceId, false)).ok);
    assert.deepEqual((await hist.listTeamRuns("cy", workspaceId, { skip: 0, take: 20 }))!.runs.map((r) => r.title), ["ann recent"]);
    assert.equal(await hist.getRunForViewer(bobRun, "cy"), null);
    assert.equal((await hist.getRunForViewer(bobRun, "bob"))?.title, "bob recent"); // still their own

    assert.equal((await hist.setTeamSharedHistory("ann", workspaceId, false)).ok, false);
    assert.ok((await hist.setTeamSharedHistory("owner", workspaceId, false)).ok);
    const off = (await hist.listTeamRuns("cy", workspaceId, { skip: 0, take: 20 }))!;
    assert.equal(off.enabled, false);
    assert.equal(off.runs.length, 0);
    assert.equal(await hist.getRunForViewer(annRun, "cy"), null);
    await hist.setTeamSharedHistory("owner", workspaceId, true);
    await hist.setMemberShareHistory("bob", workspaceId, true);
  });
});

describe("team analytics", () => {
  before(async () => {
    const add = (userId: string, tool: string, date: string, count: number) => db.toolUsageDaily.create({ data: { subjectKey: `user:${userId}`, tool, date, count } });
    const d = (n: number) => daysAgo(n).toISOString().slice(0, 10);
    await add("bob", "prompt-optimizer", d(3), 4);
    await add("bob", "prompt-optimizer", d(20), 99); // before bob joined and outside the window: ignored
    await add("owner", "token-optimizer", d(1), 6);
    await add("solo", "prompt-optimizer", d(1), 50); // not on the team
  });

  it("is only for owners and admins", async () => {
    assert.equal(await analytics.getTeamAnalytics("ann", workspaceId, 7), null);
    assert.equal(await analytics.getTeamAnalytics("solo", workspaceId, 7), null);
    assert.ok(await analytics.getTeamAnalytics("owner", workspaceId, 7));
  });

  it("counts only members' runs since they joined, per day, member and tool", async () => {
    const a = (await analytics.getTeamAnalytics("owner", workspaceId, 7))!;
    // ann: 2 optimizer runs today (from the pool test); cy: 1 token run; bob: 4; owner: 6
    assert.equal(a.totalRuns, 2 + 1 + 4 + 6 + 1); // + bob's 1 run from the pool test
    assert.equal(a.daily.length, 7);
    assert.equal(a.byMember.find((m) => m.userId === "bob")?.runs, 5);
    assert.equal(a.byMember[0].userId, "owner");
    assert.equal(a.byTool.find((t) => t.tool === "token-optimizer")?.runs, 7);
    assert.equal(a.activeMembers, 4);
    assert.equal(a.memberCount, 4);
    assert.equal(a.pool[0].used, 3);
  });

  it("uses the requested window", async () => {
    const a = (await analytics.getTeamAnalytics("owner", workspaceId, 2))!;
    assert.equal(a.daily.length, 2);
    assert.equal(a.byMember.find((m) => m.userId === "bob")?.runs, 1); // only today's; the 3-days-ago run is outside
  });
});
