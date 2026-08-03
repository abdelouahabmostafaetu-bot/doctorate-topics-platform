// Tolerant HTTP GET layer for Algerian university repositories.
//
// Why not global fetch()? Many .dz DSpace servers ship an expired or
// self-signed TLS certificate, and undici rejects them with the opaque
// message "fetch failed". These are public read-only catalogues and we never
// send credentials to them, so we accept the certificate and, above all, we
// surface the REAL error cause instead of swallowing it.

import * as http from "node:http";
import * as https from "node:https";

export const UA = "docmathdz-harvester/1.0 (+https://www.docmathdz.dev)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Flattens an Error chain (message + code + cause) into one readable line. */
export function describeError(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  let guard = 0;
  while (cur && guard++ < 6) {
    if (cur instanceof Error) {
      const code = (cur as NodeJS.ErrnoException).code;
      parts.push(cur.message + (code ? " [" + code + "]" : ""));
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.length ? parts.join(" <- ") : "unknown error";
}

export type RawResponse = { status: number; body: Buffer };

export function rawGet(
  url: string,
  opts: { accept?: string; timeoutMs?: number; redirects?: number } = {}
): Promise<RawResponse> {
  const accept = opts.accept || "*/*";
  const timeoutMs = opts.timeoutMs ?? 90000;
  const redirects = opts.redirects ?? 5;

  return new Promise<RawResponse>((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      reject(new Error("bad url: " + url));
      return;
    }

    const secure = u.protocol === "https:";
    const mod = secure ? https : http;

    const req = mod.request(
      u,
      {
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: accept,
          "Accept-Encoding": "identity",
        },
        ...(secure ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;

        if (status >= 300 && status < 400 && loc && redirects > 0) {
          res.resume();
          let next = "";
          try {
            next = new URL(loc, u).toString();
          } catch {
            reject(new Error("bad redirect target: " + loc));
            return;
          }
          rawGet(next, { accept, timeoutMs, redirects: redirects - 1 }).then(
            resolve,
            reject
          );
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ status, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout after " + timeoutMs + "ms"));
    });
    req.on("error", reject);
    req.end();
  });
}

export async function getText(
  url: string,
  opts: { accept?: string; timeoutMs?: number; tries?: number } = {}
): Promise<string> {
  const tries = opts.tries ?? 3;
  let last: unknown = null;

  for (let i = 0; i < tries; i++) {
    try {
      const r = await rawGet(url, {
        accept: opts.accept,
        timeoutMs: opts.timeoutMs,
      });
      if (r.status < 200 || r.status >= 300) {
        throw new Error("HTTP " + r.status);
      }
      return new TextDecoder("utf-8").decode(r.body);
    } catch (e) {
      last = e;
      if (i < tries - 1) await sleep(1500 * (i + 1));
    }
  }

  throw new Error(describeError(last));
}

export async function getJson(
  url: string,
  opts: { timeoutMs?: number; tries?: number } = {}
): Promise<unknown> {
  const text = await getText(url, {
    accept: "application/json",
    timeoutMs: opts.timeoutMs ?? 60000,
    tries: opts.tries,
  });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("invalid JSON from " + url + " (" + text.slice(0, 120) + ")");
  }
}
