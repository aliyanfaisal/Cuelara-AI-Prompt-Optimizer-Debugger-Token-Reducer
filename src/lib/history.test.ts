import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let history: typeof import("./history");
let extractor: typeof import("./rag/history");
let describeRun: typeof import("./history-display").describeRun;

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  await db.$executeRawUnsafe(`INSERT INTO "User" ("id") VALUES ('alice'), ('bob')`);
  history = await import("./history");
  extractor = await import("./rag/history");
  ({ describeRun } = await import("./history-display"));
});

after(async () => {
  await closeDb();
});

describe("saveToolRun", () => {
  it("never saves anonymous runs", async () => {
    const id = await history.saveToolRun({ userId: null, tool: "prompt-optimizer", title: "t", input: { a: 1 }, result: { b: 2 } });
    assert.equal(id, null);
    assert.equal(await db.toolRun.count(), 0);
  });

  it("saves a run with its inputs and result", async () => {
    const id = await history.saveToolRun({
      userId: "alice",
      tool: "prompt-optimizer",
      title: "First",
      input: { rawInput: "hello", mode: "Coding", skipped: undefined },
      result: { optimizedPrompt: "HELLO" },
    });
    assert.ok(id);
    const run = await db.toolRun.findUniqueOrThrow({ where: { id: id! } });
    assert.deepEqual(run.input, { rawInput: "hello", mode: "Coding" });
    assert.deepEqual(run.result, { optimizedPrompt: "HELLO" });
    assert.equal(run.userId, "alice");
  });

  it("updates the same run in place when resubmitted with its historyId", async () => {
    const first = (await history.saveToolRun({ userId: "alice", tool: "token-optimizer", title: "v1", input: { input: "a" }, result: { compressedText: "a" } }))!;
    const again = await history.saveToolRun({ userId: "alice", tool: "token-optimizer", title: "v2", input: { input: "b" }, result: { compressedText: "b" }, historyId: first });
    assert.equal(again, first);
    assert.equal(await db.toolRun.count({ where: { tool: "token-optimizer" } }), 1);
    const run = await db.toolRun.findUniqueOrThrow({ where: { id: first } });
    assert.equal(run.title, "v2");
    assert.deepEqual(run.input, { input: "b" });
  });

  it("never lets a historyId overwrite another user's run or another tool's run", async () => {
    const alices = (await history.saveToolRun({ userId: "alice", tool: "prompt-formatter", title: "mine", input: { i: 1 }, result: { r: 1 } }))!;

    const bobs = await history.saveToolRun({ userId: "bob", tool: "prompt-formatter", title: "bob", input: { i: 2 }, result: { r: 2 }, historyId: alices });
    assert.notEqual(bobs, alices);
    assert.equal((await db.toolRun.findUniqueOrThrow({ where: { id: alices } })).title, "mine");

    const otherTool = await history.saveToolRun({ userId: "alice", tool: "prompt-debugger", title: "x", input: {}, result: {}, historyId: alices });
    assert.notEqual(otherTool, alices);
    assert.equal((await db.toolRun.findUniqueOrThrow({ where: { id: alices } })).tool, "prompt-formatter");
  });

  it("skips runs that are too large instead of failing", async () => {
    const id = await history.saveToolRun({ userId: "alice", tool: "prompt-optimizer", title: "big", input: { text: "x".repeat(1_100_000) }, result: {} });
    assert.equal(id, null);
  });

  it("keeps only as many runs per tool as the user's plan allows, and the default without a plan", async () => {
    await db.$executeRawUnsafe(`INSERT INTO "Plan" ("id","name","slug","priceMonthlyCents","isDefault","isActive","historyPerTool","updatedAt") VALUES ('p3','Tiny','tiny',0,false,true,3,now())`);
    await db.$executeRawUnsafe(`UPDATE "User" SET "planId" = 'p3' WHERE "id" = 'bob'`);
    assert.equal(await history.historyLimitForUser("bob"), 3);
    assert.equal(await history.historyLimitForUser("alice"), history.DEFAULT_HISTORY_PER_TOOL);

    for (let i = 0; i < 5; i++) {
      await history.saveToolRun({ userId: "bob", tool: "intelligence-score", title: `run ${i}`, input: {}, result: {} });
      await new Promise((r) => setTimeout(r, 5)); // distinct updatedAt so "oldest" is well defined
    }
    const kept = await db.toolRun.findMany({ where: { userId: "bob", tool: "intelligence-score" }, orderBy: { updatedAt: "desc" } });
    assert.deepEqual(kept.map((r) => r.title), ["run 4", "run 3", "run 2"]);

    // Another tool has its own allowance.
    await history.saveToolRun({ userId: "bob", tool: "prompt-debugger", title: "other tool", input: {}, result: {} });
    assert.equal(await db.toolRun.count({ where: { userId: "bob", tool: "prompt-debugger" } }), 1);
  });

  it("uses the default when the plan is inactive", async () => {
    await db.$executeRawUnsafe(`UPDATE "Plan" SET "isActive" = false WHERE "id" = 'p3'`);
    assert.equal(await history.historyLimitForUser("bob"), history.DEFAULT_HISTORY_PER_TOOL);
    await db.$executeRawUnsafe(`UPDATE "Plan" SET "isActive" = true WHERE "id" = 'p3'`);
  });

  it("pruneToolRuns trims every tool to a smaller limit (used on downgrade)", async () => {
    await db.toolRun.deleteMany({ where: { userId: "alice" } });
    for (const tool of ["prompt-optimizer", "token-optimizer"] as const) {
      await db.toolRun.createMany({
        data: Array.from({ length: 4 }, (_, i) => ({ userId: "alice", tool, title: `${tool} ${i}`, input: {}, result: {}, updatedAt: new Date(Date.now() - i * 60_000) })),
      });
    }
    assert.equal(await history.pruneToolRuns("alice", 2), 4);
    assert.equal(await db.toolRun.count({ where: { userId: "alice", tool: "prompt-optimizer" } }), 2);
    assert.equal(await db.toolRun.count({ where: { userId: "alice", tool: "token-optimizer" } }), 2);
    assert.ok(await db.toolRun.findFirst({ where: { title: "prompt-optimizer 0" } }));
    assert.equal(await db.toolRun.findFirst({ where: { title: "prompt-optimizer 3" } }), null);
  });
});

describe("effective plan (users without a plan follow the default plan)", () => {
  it("falls back to the default plan for a user with no plan, and to the built-in default if there is none", async () => {
    const plans = await import("./plans");
    await db.$executeRawUnsafe(`INSERT INTO "User" ("id") VALUES ('carol')`);
    assert.equal(await plans.getEffectivePlan("carol"), null);
    assert.equal(await history.historyLimitForUser("carol"), history.DEFAULT_HISTORY_PER_TOOL);

    await db.$executeRawUnsafe(`INSERT INTO "Plan" ("id","name","slug","priceMonthlyCents","isDefault","isActive","historyPerTool","updatedAt") VALUES ('pd','Starter','starter',0,true,true,7,now())`);
    await db.$executeRawUnsafe(`INSERT INTO "PlanToolLimit" ("id","planId","tool","dailyLimit") VALUES ('l1','pd','prompt-optimizer',10)`);

    const plan = await plans.getEffectivePlan("carol");
    assert.equal(plan?.name, "Starter");
    assert.deepEqual(plan?.limits, [{ tool: "prompt-optimizer", dailyLimit: 10, teamDailyLimit: null }]);
    assert.equal(await history.historyLimitForUser("carol"), 7);

    // Their own active plan still wins over the default.
    await db.$executeRawUnsafe(`UPDATE "User" SET "planId" = 'p3' WHERE "id" = 'carol'`);
    assert.equal((await plans.getEffectivePlan("carol"))?.name, "Tiny");
    // ...but an inactive own plan falls back to the default again.
    await db.$executeRawUnsafe(`UPDATE "Plan" SET "isActive" = false WHERE "id" = 'p3'`);
    assert.equal((await plans.getEffectivePlan("carol"))?.name, "Starter");

    await db.$executeRawUnsafe(`UPDATE "Plan" SET "isActive" = true WHERE "id" = 'p3'`);
    await db.$executeRawUnsafe(`DELETE FROM "Plan" WHERE "id" = 'pd'`);
  });
});

describe("getRunForUser", () => {
  it("returns the owner's run and nothing for anyone else", async () => {
    const id = (await history.saveToolRun({ userId: "alice", tool: "prompt-optimizer", title: "private", input: { secret: 1 }, result: {} }))!;
    assert.equal((await history.getRunForUser(id, "alice"))?.title, "private");
    assert.equal(await history.getRunForUser(id, "bob"), null);
  });
});

describe("context extractor history", () => {
  it("shape-checks and caps the metadata the page sends", () => {
    const meta = extractor.sanitizeExtractorMeta({ sourceMode: "weird", filename: "f".repeat(1000), formatStyle: "html", wantsPrompt: false, historyId: 5 });
    assert.equal(meta.sourceMode, "file");
    assert.equal(meta.filename.length, 300);
    assert.equal(meta.formatStyle, "markdown");
    assert.equal(meta.wantsPrompt, false);
    assert.equal(meta.historyId, undefined);
    assert.equal(extractor.sanitizeExtractorMeta(null).wantsPrompt, true);
  });

  it("saves the excerpts with the question and where they came from", async () => {
    const id = await extractor.saveExtractorRun({
      userId: "alice",
      meta: extractor.sanitizeExtractorMeta({ sourceMode: "text", rawText: "the document", aiTask: "Summarise" }),
      searchQuery: "refund policy",
      depth: "top3",
      documentId: "doc1",
      originalTokens: 1200,
      snippets: [{ id: 0, relevance: 91, section: "Refunds", content: "Refunds take 5 days." }],
    });
    const run = await db.toolRun.findUniqueOrThrow({ where: { id: id! } });
    assert.equal(run.tool, "context-extractor");
    assert.equal(run.title, "refund policy");
    assert.equal((run.input as { rawText: string }).rawText, "the document");
    assert.equal((run.result as { originalTokens: number }).originalTokens, 1200);
  });
});

describe("history helpers", () => {
  it("builds one-line titles", () => {
    assert.equal(history.titleFrom("  hello \n  world  "), "hello world");
    assert.equal(history.titleFrom(""), "Untitled run");
    assert.ok(history.titleFrom("x".repeat(200)).length <= 91);
  });

  it("describes a run's options", () => {
    assert.equal(describeRun("prompt-optimizer", { mode: "Coding", level: "Balanced" }), "Coding · Balanced");
    assert.equal(describeRun("context-extractor", { sourceMode: "text", depth: "top5" }), "Pasted text · Top 5");
    assert.equal(describeRun("nope", null), "nope");
  });
});
