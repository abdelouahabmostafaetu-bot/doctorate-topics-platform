import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { verifyPrivateFactors } from "../src/lib/private-access/verify";

async function main() {
  const cache = new Set<string>();
  let count = 0;
  const store = {
    async hit() { return ++count; },
    async claim(key: string) { if (cache.has(key)) return false; cache.add(key); return true; },
  };
  const secret = authenticator.generateSecret();
  const passwordHash = await bcrypt.hash("a-test-password-not-for-production", 10);
  const params = {
    password: "a-test-password-not-for-production", code: authenticator.generate(secret),
    clientKey: "test-client", passwordHash, totpSecret: secret,
    replayKey: "x".repeat(64), store,
  };
  assert.equal(await verifyPrivateFactors({ ...params, password: "wrong" }), false);
  assert.equal(await verifyPrivateFactors({ ...params, code: "abcdef" }), false);
  assert.equal(await verifyPrivateFactors({ ...params, replayKey: "" }), false);
  assert.equal(await verifyPrivateFactors(params), true);
  assert.equal(await verifyPrivateFactors(params), false, "TOTP replay must be rejected");
  assert.equal(await verifyPrivateFactors({ ...params, store: { hit: async () => { throw Error(); }, claim: async () => true } }), false);
  console.log("Private factor checks passed");
}
main().catch((error) => { console.error(error); process.exit(1); });
