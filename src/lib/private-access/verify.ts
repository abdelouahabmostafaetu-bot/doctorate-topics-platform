import "server-only";
import bcrypt from "bcryptjs";
import { createHmac } from "node:crypto";
import { authenticator } from "otplib";
import { privateSecurityStore, type PrivateSecurityStore } from "./security-store";

/** Verifies both factors. Any missing configuration or database failure denies access. */
export async function verifyPrivateFactors(input: {
  password: string; code: string; clientKey: string; passwordHash: string;
  totpSecret: string; replayKey: string; store?: PrivateSecurityStore;
}): Promise<boolean> {
  const {password,code,clientKey,passwordHash,totpSecret,replayKey,store=privateSecurityStore}=input;
  if (!password || password.length > 1024 || !/^\d{6}$/.test(code) || !clientKey || !passwordHash || !totpSecret || replayKey.length < 32) return false;
  try {
    const now=Date.now(), clientHash=createHmac("sha256",replayKey).update(clientKey).digest("hex");
    const minute=Math.floor(now/60_000), fifteen=Math.floor(now/900_000);
    const [globalCount,clientCount]=await Promise.all([
      store.hit(`login-global:${minute}`,new Date((minute+2)*60_000)),
      store.hit(`login-client:${fifteen}:${clientHash}`,new Date((fifteen+2)*900_000)),
    ]);
    if (globalCount>120 || clientCount>10 || !(await bcrypt.compare(password,passwordHash))) return false;
    if (!authenticator.clone({window:1}).check(code,totpSecret)) return false;
    const codeHash=createHmac("sha256",replayKey).update(code).digest("hex");
    return await store.claim(`totp:${codeHash}`,new Date(now+90_000));
  } catch { return false; }
}
