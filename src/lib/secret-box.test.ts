import assert from "node:assert/strict";
import { test } from "node:test";

// server-only throws outside a Next build; stub it so the module can be exercised directly.
import Module from "node:module";
const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function (request: unknown, ...rest: unknown[]) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, ...rest);
};

async function load() {
  return import("./secret-box");
}

test("round-trips a secret and never stores it in the clear", async () => {
  process.env.KEY_ENCRYPTION_SECRET = "test-secret-value-1234567890";
  const { encryptSecret, decryptSecret, isEncryptedSecret } = await load();
  const stored = encryptSecret("AIzaSyExampleKey");
  assert.ok(isEncryptedSecret(stored));
  assert.ok(!stored.includes("AIzaSyExampleKey"));
  assert.equal(decryptSecret(stored), "AIzaSyExampleKey");
});

test("legacy plain-text values pass through unchanged", async () => {
  process.env.KEY_ENCRYPTION_SECRET = "test-secret-value-1234567890";
  const { decryptSecret } = await load();
  assert.equal(decryptSecret("gsk_plain_legacy"), "gsk_plain_legacy");
});

test("a wrong secret cannot decrypt, and tryDecryptSecret returns null", async () => {
  process.env.KEY_ENCRYPTION_SECRET = "first-secret-first-secret-1234";
  const { encryptSecret, decryptSecret, tryDecryptSecret } = await load();
  const stored = encryptSecret("sk-abc");
  process.env.KEY_ENCRYPTION_SECRET = "different-secret-different-1234";
  assert.throws(() => decryptSecret(stored));
  assert.equal(tryDecryptSecret(stored), null);
});

test("refuses to encrypt without a secret", async () => {
  delete process.env.KEY_ENCRYPTION_SECRET;
  const { encryptSecret } = await load();
  assert.throws(() => encryptSecret("x"), /KEY_ENCRYPTION_SECRET/);
});
