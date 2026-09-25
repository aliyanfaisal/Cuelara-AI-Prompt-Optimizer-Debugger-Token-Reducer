import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/client/client";
import { createTestDb } from "@/lib/blog-sync/test-db";

let db: PrismaClient;
let closeDb: () => Promise<void>;
let ws: typeof import("./workspace");
let plans: typeof import("./plans");

let teamPlanId: string;
let freePlanId: string;
let workspaceId: string;

before(async () => {
  ({ db, close: closeDb } = await createTestDb());
  ws = await import("./workspace");
  plans = await import("./plans");

  freePlanId = (await db.plan.create({ data: { name: "Free", slug: "free", isDefault: true, maxSeats: 0, historyPerTool: 20 } })).id;
  teamPlanId = (
    await db.plan.create({ data: { name: "Team", slug: "team", priceMonthlyCents: 3900, maxSeats: 3, allowsMultipleSessions: true, historyPerTool: 100, limits: { create: [{ tool: "prompt-optimizer", dailyLimit: 500 }] } } })
  ).id;

  // owner is on the Team plan (3 seats); everyone else is on Free.
  await db.user.create({ data: { id: "owner", email: "owner@x.com", name: "Olive Owner", planId: teamPlanId } });
  for (const [id, email] of [["admin", "admin@x.com"], ["member", "member@x.com"], ["member2", "member2@x.com"], ["outsider", "outsider@x.com"], ["free", "free@x.com"]]) {
    await db.user.create({ data: { id, email, planId: freePlanId } });
  }
});

after(async () => {
  await closeDb();
});

describe("personal workspace", () => {
  it("is created once, on first use", async () => {
    const a = await ws.ensurePersonalWorkspace("outsider");
    const b = await ws.ensurePersonalWorkspace("outsider");
    assert.equal(a.id, b.id);
    assert.equal(await db.workspace.count({ where: { userId: "outsider", type: "personal" } }), 1);
    assert.equal(await ws.getRole("outsider", a.id), "OWNER");
  });
});

describe("creating a team", () => {
  it("needs a plan that hosts teams", async () => {
    const r = await ws.createTeamWorkspace("free", "Nope");
    assert.equal(r.ok, false);
  });

  it("creates the team with the caller as owner, once", async () => {
    const r = await ws.createTeamWorkspace("owner", "  Acme   Prompts ");
    assert.ok(r.ok);
    workspaceId = (r as { workspaceId: string }).workspaceId;
    assert.equal((await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } })).name, "Acme Prompts");
    assert.equal(await ws.getRole("owner", workspaceId), "OWNER");
    assert.equal((await ws.createTeamWorkspace("owner", "Second")).ok, false);
  });
});

describe("invitations and seats", () => {
  it("only owners and admins can invite, and only the owner can invite admins", async () => {
    assert.equal((await ws.createInvite({ workspaceId, actorId: "outsider", email: "x@x.com", role: "MEMBER" })).ok, false);
    const r = await ws.createInvite({ workspaceId, actorId: "owner", email: "Admin@X.com", role: "ADMIN" });
    assert.ok(r.ok);
    assert.equal((r as { invite: { email: string } }).invite.email, "admin@x.com");
  });

  it("rejects bad emails and roles", async () => {
    assert.equal((await ws.createInvite({ workspaceId, actorId: "owner", email: "not-an-email", role: "MEMBER" })).ok, false);
    assert.equal((await ws.createInvite({ workspaceId, actorId: "owner", email: "a@b.com", role: "OWNER" })).ok, false);
  });

  it("pending invitations hold seats (3 seats: owner + 2), and a re-send doesn't need a new one", async () => {
    assert.ok((await ws.createInvite({ workspaceId, actorId: "owner", email: "member@x.com", role: "MEMBER" })).ok); // owner + admin-invite + this = 3
    const full = await ws.createInvite({ workspaceId, actorId: "owner", email: "member2@x.com", role: "MEMBER" });
    assert.equal(full.ok, false);
    assert.match((full as { error: string }).error, /seats/);
    assert.ok((await ws.createInvite({ workspaceId, actorId: "owner", email: "member@x.com", role: "MEMBER" })).ok);
  });

  it("re-sending replaces the token so the old link stops working", async () => {
    const before = (await db.workspaceInvite.findUniqueOrThrow({ where: { workspaceId_email: { workspaceId, email: "member@x.com" } } })).token;
    await ws.createInvite({ workspaceId, actorId: "owner", email: "member@x.com", role: "MEMBER" });
    const after = (await db.workspaceInvite.findUniqueOrThrow({ where: { workspaceId_email: { workspaceId, email: "member@x.com" } } })).token;
    assert.notEqual(before, after);
    assert.equal((await ws.acceptInvite(before, "member", "member@x.com")).ok, false);
  });
});

describe("accepting an invitation", () => {
  const tokenFor = async (email: string) => (await db.workspaceInvite.findUniqueOrThrow({ where: { workspaceId_email: { workspaceId, email } } })).token;

  it("requires the invited email, not just the link", async () => {
    const r = await ws.acceptInvite(await tokenFor("member@x.com"), "outsider", "outsider@x.com");
    assert.equal(r.ok, false);
    assert.equal(await ws.getRole("outsider", workspaceId), null);
  });

  it("rejects an expired invitation", async () => {
    await db.workspaceInvite.update({ where: { workspaceId_email: { workspaceId, email: "member@x.com" } }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r = await ws.acceptInvite(await tokenFor("member@x.com"), "member", "member@x.com");
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /expired/);
    await db.workspaceInvite.update({ where: { workspaceId_email: { workspaceId, email: "member@x.com" } }, data: { expiresAt: new Date(Date.now() + 86_400_000) } });
  });

  it("joins the team, is single-use, and takes the invited role", async () => {
    const token = await tokenFor("admin@x.com");
    assert.ok((await ws.acceptInvite(token, "admin", "ADMIN@x.com")).ok);
    assert.equal(await ws.getRole("admin", workspaceId), "ADMIN");
    assert.equal((await ws.acceptInvite(token, "admin", "admin@x.com")).ok, false);
    assert.ok((await ws.acceptInvite(await tokenFor("member@x.com"), "member", "member@x.com")).ok);
    assert.equal(await ws.getRole("member", workspaceId), "MEMBER");
  });
});

describe("team plan inheritance", () => {
  it("gives members the manager's Team plan, and removes it when they leave", async () => {
    const asMember = await plans.getEffectivePlan("member");
    assert.equal(asMember?.slug, "team");
    assert.equal(asMember?.allowsMultipleSessions, true);
    assert.equal(asMember?.limits.find((l) => l.tool === "prompt-optimizer")?.dailyLimit, 500);
    assert.equal((await plans.getEffectivePlan("free"))?.slug, "free");
  });

  it("falls back to the member's own plan if the manager's plan can no longer host a team", async () => {
    await db.user.update({ where: { id: "owner" }, data: { planId: freePlanId } });
    assert.equal((await plans.getEffectivePlan("member"))?.slug, "free");
    await db.user.update({ where: { id: "owner" }, data: { planId: teamPlanId } });
  });
});

describe("members", () => {
  it("admins remove plain members but not other admins or the owner", async () => {
    assert.equal((await ws.removeMember("admin", workspaceId, "owner")).ok, false);
    assert.equal((await ws.removeMember("member", workspaceId, "admin")).ok, false);
    assert.equal((await ws.removeMember("admin", workspaceId, "admin")).ok, false);
  });

  it("only the owner changes roles", async () => {
    assert.equal((await ws.changeMemberRole("admin", workspaceId, "member", "ADMIN")).ok, false);
    assert.ok((await ws.changeMemberRole("owner", workspaceId, "member", "ADMIN")).ok);
    assert.ok((await ws.changeMemberRole("owner", workspaceId, "member", "MEMBER")).ok);
  });

  it("the owner cannot leave; a member can, and loses the team plan", async () => {
    assert.equal((await ws.leaveTeam("owner", workspaceId)).ok, false);
    assert.ok((await ws.leaveTeam("member", workspaceId)).ok);
    assert.equal(await ws.getRole("member", workspaceId), null);
    assert.equal((await plans.getEffectivePlan("member"))?.slug, "free");
  });

  it("removing a member frees their seat", async () => {
    const before = await ws.seatUsage(workspaceId);
    assert.ok((await ws.removeMember("owner", workspaceId, "admin")).ok);
    assert.equal((await ws.seatUsage(workspaceId)).used, before.used - 1);
  });
});

describe("prompt library", () => {
  let ownPromptId: string;
  let ownerPromptId: string;

  before(async () => {
    // put "member" and "admin" back on the team for these checks
    await db.workspaceMember.createMany({ data: [{ workspaceId, userId: "member", role: "MEMBER" }, { workspaceId, userId: "admin", role: "ADMIN" }] });
    ownPromptId = ((await ws.savePrompt("member", workspaceId, { title: "  My   prompt ", content: "Do X", tags: ["Alpha Beta", "alpha-beta", 3] })) as { id: string }).id;
    ownerPromptId = ((await ws.savePrompt("owner", workspaceId, { title: "", content: "Owner prompt text" })) as { id: string }).id;
  });

  it("normalises title and tags, and titles untitled prompts from their content", async () => {
    const a = await db.savedPrompt.findUniqueOrThrow({ where: { id: ownPromptId } });
    assert.equal(a.title, "My prompt");
    assert.deepEqual(a.tags, ["alpha-beta"]);
    assert.equal((await db.savedPrompt.findUniqueOrThrow({ where: { id: ownerPromptId } })).title, "Owner prompt text");
  });

  it("refuses non-members and empty prompts", async () => {
    assert.equal((await ws.savePrompt("free", workspaceId, { title: "x", content: "y" })).ok, false);
    assert.equal((await ws.savePrompt("member", workspaceId, { title: "x", content: "   " })).ok, false);
  });

  it("members edit only their own prompts; owners and admins edit anyone's", async () => {
    assert.ok((await ws.updatePrompt("member", ownPromptId, { title: "Mine v2", content: "Do X better" })).ok);
    assert.equal((await ws.updatePrompt("member", ownerPromptId, { title: "hack", content: "hack" })).ok, false);
    assert.ok((await ws.updatePrompt("admin", ownPromptId, { title: "Mine v3", content: "Do X best" })).ok);
    assert.equal((await ws.deletePrompt("member", ownerPromptId)).ok, false);
    assert.ok((await ws.deletePrompt("owner", ownPromptId)).ok);
  });

  it("deleting the team deletes its library, but only for the owner", async () => {
    assert.equal((await ws.deleteTeamWorkspace("admin", workspaceId)).ok, false);
    assert.ok((await ws.deleteTeamWorkspace("owner", workspaceId)).ok);
    assert.equal(await db.savedPrompt.count({ where: { workspaceId } }), 0);
    assert.equal(await db.workspaceMember.count({ where: { workspaceId } }), 0);
  });
});
