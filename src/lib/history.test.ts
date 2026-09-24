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

  it("keeps only the newest runs per tool", async () => {
    await db.toolRun.deleteMany({ where: { userId: "bob", tool: "intelligence-score" } });
    await db.toolRun.createMany({
      data: Array.from({ length: history.MAX_RUNS_PER_TOOL }, (_, i) => ({
        userId: "bob",
        tool: "intelligence-score",
        title: `old ${i}`,
        input: {},
        result: {},
        updatedAt: new Date(Date.now() - (i + 10) * 60_000),
      })),
    });
    await history.saveToolRun({ userId: "bob", tool: "intelligence-score", title: "newest", input: {}, result: {} });
    assert.equal(await db.toolRun.count({ where: { userId: "bob", tool: "intelligence-score" } }), history.MAX_RUNS_PER_TOOL);
    assert.ok(await db.toolRun.findFirst({ where: { title: "newest" } }));
    assert.equal(await db.toolRun.findFirst({ where: { title: `old ${history.MAX_RUNS_PER_TOOL - 1}` } }), null);
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
