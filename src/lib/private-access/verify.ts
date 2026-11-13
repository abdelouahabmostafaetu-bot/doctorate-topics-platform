import "server-only";

import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { authenticator } from "otplib";
import { Redis } from "@upstash/redis";

// This helper is not wired to sign-in yet. Private mode must not be enabled
// until the complete middleware, registration, session, and recovery flow is tested.
type RedisClient = Pick<Redis, "eval" | "set">;

/** Verifies both factors. Any missing configuration or storage failure denies access. */
export async function verifyPrivateFactors(input: {
  password: string;
  code: string;
  clientKey: string;
  passwordHash: string;
  totpSecret: string;
  replayKey: string;
  redis: RedisClient;
}): Promise<boolean> {
  const { password, code, clientKey, passwordHash, totpSecret, replayKey, redis } = input;
  if (!password || password.length > 1024 || !/^\d{6}$/.test(code) ||
      !clientKey || !passwordHash || !totpSecret || replayKey.length < 32) return false;
  try {
    // Atomic fixed window shared across all serverless instances. Both a global and
    // client-specific limit apply, so forging an IP cannot evade every limit.
    const rateScript = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n`;
    const key = createHmac("sha256", replayKey).update(clientKey).digest("hex");
    const [globalCount, clientCount] = await Promise.all([
      redis.eval<number[], number>(rateScript, ["private:login:global"], [60]),
      redis.eval<number[], number>(rateScript, [`private:login:client:${key}`], [900]),
    ]);
    if (globalCount > 120 || clientCount > 10) return false;
    if (!(await bcrypt.compare(password, passwordHash))) return false;
    // A one-step clock allowance handles minor device clock drift.
    const totp = authenticator.clone({ window: 1 });
    if (!totp.check(code, totpSecret)) return false;
    const codeKey = createHmac("sha256", replayKey).update(code).digest("hex");
    // Prevent replay across parallel serverless instances; allow reuse only after
    // the previous token can no longer be in the accepted clock window.
    const claimed = await redis.set(`private:totp:${codeKey}`, "1", { nx: true, ex: 90 });
    return claimed === "OK";
  } catch {
    return false;
  }
}

export function privateRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}
