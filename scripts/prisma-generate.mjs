// Regenerates the Prisma client (src/generated/client) from prisma/schema.prisma. Runs before every `next build`
// (see the "prebuild" script), so a schema change can never reach a build with a stale client again.
//
// `prisma generate` never connects to the database, but prisma.config.ts reads DATABASE_URL and throws when it is
// missing — and CI builds without one — so a placeholder is supplied only when none is set.
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL || "postgresql://generate-only:x@localhost:5432/generate_only" };

const result = spawnSync(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), "generate"], {
  cwd: root,
  env,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
