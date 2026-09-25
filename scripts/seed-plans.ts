import "dotenv/config";
import { PrismaClient } from "../src/generated/client/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Creates the three starter tiers shown on /pricing, for a fresh database. CREATE-ONLY: a plan whose slug
// already exists is left completely alone, so edits made in the admin Plans page are never overwritten and
// this is safe to run again. (Change a plan in the admin, not here.) The Free limits mirror the built-in
// signed-in defaults (15 runs/day per tool, 5 documents and 100 prompts for the Context Extractor).
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

const TOOLS = ["prompt-builder", "prompt-optimizer", "token-optimizer", "prompt-debugger", "prompt-formatter", "intelligence-score", "site-to-prompt"];

const limitsFor = (perTool: number, documents: number, prompts: number) => [
  ...TOOLS.map((tool) => ({ tool, dailyLimit: perTool })),
  { tool: "context-extractor-document", dailyLimit: documents },
  { tool: "context-extractor-prompt", dailyLimit: prompts },
];

const PLANS = [
  {
    name: "Free",
    slug: "free",
    description: "For trying Cuelara and occasional prompt work.",
    priceMonthlyCents: 0,
    isDefault: true,
    isFeatured: false,
    historyPerTool: 20,
    features: ["All 9 tools included", "15 runs per tool, per day", "Context Extractor: 5 documents and 100 prompts a day", "Saves your last 20 runs per tool", "Prompt Cookbook access", "Community support"].join("\n"),
    limits: limitsFor(15, 5, 100),
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For developers and creators who use AI every day.",
    priceMonthlyCents: 1200,
    isDefault: false,
    isFeatured: true,
    historyPerTool: 50,
    features: ["Everything in Free", "100 runs per tool, per day", "Context Extractor: 30 documents and 500 prompts a day", "Saves your last 50 runs per tool", "Priority processing", "Email support"].join("\n"),
    limits: limitsFor(100, 30, 500),
  },
  {
    name: "Team",
    slug: "team",
    description: "For teams building with AI together.",
    priceMonthlyCents: 3900,
    isDefault: false,
    isFeatured: false,
    historyPerTool: 100,
    allowsMultipleSessions: true,
    maxSeats: 5,
    features: ["Everything in Pro", "500 runs per tool, per day", "Context Extractor: 150 documents and 2,000 prompts a day", "Saves your last 100 runs per tool", "A shared team workspace with 5 seats", "Priority support"].join("\n"),
    limits: limitsFor(500, 150, 2000),
  },
  {
    name: "Own Keys",
    slug: "own-keys",
    description: "Bring your own AI provider keys and use them across every tool.",
    priceMonthlyCents: 0,
    isDefault: false,
    isFeatured: false,
    allowsOwnKeys: true,
    historyPerTool: 50,
    features: ["Use your own Gemini, Groq and OpenRouter keys", "Choose the order your models are tried in", "500 runs per tool, per day", "Context Extractor: 100 documents and 500 prompts a day", "Saves your last 50 runs per tool", "Email support"].join("\n"),
    limits: limitsFor(500, 100, 500),
  },
];

// A tool added after a plan was created has no limit row for that plan, so the plan's users would silently get the
// plain signed-in default. Give every existing plan the same limit as its Prompt Formatter one (a comparable
// single-call tool). Only fills gaps: a limit already set in the admin Plans page is never touched.
async function backfillNewToolLimits() {
  const NEW_TOOL = "prompt-builder";
  const LIKE_TOOL = "prompt-formatter";
  for (const plan of await prisma.plan.findMany({ select: { id: true, name: true, limits: { select: { tool: true, dailyLimit: true } } } })) {
    if (plan.limits.some((l) => l.tool === NEW_TOOL)) continue;
    const like = plan.limits.find((l) => l.tool === LIKE_TOOL);
    if (!like) continue;
    await prisma.planToolLimit.create({ data: { planId: plan.id, tool: NEW_TOOL, dailyLimit: like.dailyLimit } });
    console.log(`- ${plan.name}: added ${NEW_TOOL} limit (${like.dailyLimit}/day)`);
  }
}

async function main() {
  for (const { limits, ...plan } of PLANS) {
    if (await prisma.plan.findUnique({ where: { slug: plan.slug }, select: { id: true } })) {
      console.log(`- ${plan.name.padEnd(5)} already exists, left untouched`);
      continue;
    }
    const saved = await prisma.plan.create({ data: plan });
    await prisma.planToolLimit.createMany({ data: limits.map((l) => ({ ...l, planId: saved.id })) });
    console.log(`- ${plan.name.padEnd(5)} created: $${(plan.priceMonthlyCents / 100).toFixed(2)}/mo, ${limits.length} limits`);
  }
  await backfillNewToolLimits();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
