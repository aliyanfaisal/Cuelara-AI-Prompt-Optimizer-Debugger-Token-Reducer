import "dotenv/config";
import crypto from "crypto";
import { PrismaClient } from "../src/generated/client/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// One-off, safe to re-run: encrypts every provider key (ApiKey rows) and the cookbook GEMINI_API_KEY setting that is
// still stored in plain text. Needs KEY_ENCRYPTION_SECRET in the environment — the same value the app runs with,
// and it must never change afterwards or the encrypted keys become unreadable. Same format as src/lib/secret-box.ts.
const PREFIX = "enc:v1:";
const secret = process.env.KEY_ENCRYPTION_SECRET;
if (!secret) {
  console.error("Set KEY_ENCRYPTION_SECRET first (e.g. `openssl rand -base64 32`), and add the same value to the server's environment.");
  process.exit(1);
}
const key = crypto.createHash("sha256").update(secret).digest();

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

async function main() {
  let converted = 0;
  for (const row of await prisma.apiKey.findMany({ select: { id: true, key: true } })) {
    if (row.key.startsWith(PREFIX)) continue;
    await prisma.apiKey.update({ where: { id: row.id }, data: { key: encrypt(row.key) } });
    converted++;
  }
  const setting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
  if (setting?.value && !setting.value.startsWith(PREFIX)) {
    await prisma.setting.update({ where: { key: "GEMINI_API_KEY" }, data: { value: encrypt(setting.value) } });
    converted++;
  }
  console.log(`Encrypted ${converted} plain-text value(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
