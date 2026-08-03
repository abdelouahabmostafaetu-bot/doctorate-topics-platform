// Tolerant HTTP GET layer for Algerian university repositories.
//
// Two distinct problems, two distinct cures:
//
// 1. TLS. Many .dz DSpace servers run very old stacks: expired certificates,
//    no RFC 5746 ("unsafe legacy renegotiation disabled" = EPROTO), weak
//    ciphers. But some of them ALSO reset the connection if the ClientHello
//    is too old-fashioned, so one forced legacy mode is not enough. We try a
//    ladder of profiles once, then stick to the winner for that host.
//
// 2. Flood protection. Médéa happily served 400 records then started sending
//    ECONNRESET. That is rate limiting, not TLS. Cycling through the whole
//    profile ladder on such an error made it worse (12 handshakes in a
//    second). So: only a genuine TLS-protocol error advances the ladder;
//    everything else is retried on the SAME profile with a growing pause,
//    and every request to a host is spaced by MIN_GAP_MS.
//
// These are public read-only catalogues and we never send credentials.

import * as http from "node:http";
import * as https from "node:https";
import * as crypto from "node:crypto";

export const UA = "docmathdz-harvester/1.0 (+https://www.docmathdz.dev)";

/** Minimum delay between two requests to the same host. */
const MIN_GAP_MS = 800;

/** Pause before retry n (ms). Long on purpose: these servers need to calm down. */
const BACKOFF = [2000, 6000, 15000, 30000];

const C = crypto.constants as unknown as Record<string, number>;

const LEGACY_SSL_OPTIONS =
  (C.SSL_OP_LEGACY_SERVER_CONNECT || 0) |
  (C.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION || 0);

type TlsProfile = { name: string; opts: Record<string, unknown> };

// Order matters: least intrusive first.
const PROFILES: TlsProfile[] = [
  {
    name: "reneg",
    opts: { rejectUnauthorized: false, secureOptions: LEGACY_SSL_OPTIONS },
  },
  {
    name: "plain",
    opts: { rejectUnauthorized: false },
  },
  {
    name: "reneg-tls12",
    opts: {
      rejectUnauthorized: false,
      secureOptions: LEGACY_SSL_OPTIONS,
      minVersion: "TLSv1.2",
      ciphers: "DEFAULT:@SECLEVEL=1",
    },
  },
  {
    name: "ancient",
    opts: {
      rejectUnauthorized: false,
      secureOptions: LEGACY_SSL_OPTIONS,
      minVersion: "TLSv1",
      ciphers: "DEFAULT:@SECLEVEL=0",
    },
  },
];

/** host -> index of the TLS profile known to work. */
const hostProfile = new Map<string, number>();
/** host -> timestamp of the last request, for pacing. */
const lastHit = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Waits so that requests to `host` are at least MIN_GAP_MS apart. */
async function pace(host: string) {
  const prev = lastHit.get(host) || 0;
  const wait = prev + MIN_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

/** Flattens an Error chain (message + code + cause) into one readable line. */
export function describeError(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  let guard = 0;
  while (cur && guard++ < 6) {
    if (cur instanceof Error) {
      const code = (cur as NodeJS.ErrnoException).code;
      parts.push(cur.message.split("\n")[0] + (code ? " [" + code + "]" : ""));
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.length ? parts.join(" <- ") : "unknown error";
}

/**
 * True only for handshake failures that a different TLS profile could fix.
 * ECONNRESET is deliberately NOT here: it usually means rate limiting.
 */
function isTlsProblem(e: unknown): boolean {
  const s = describeError(e);
  return (
    /EPROTO|ERR_SSL|SSL routines|wrong version number|unsupported protocol|no cipher|handshake failure|CERT_/i.test(
      s
    ) && !/ECONNRESET|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(s)
  );
}

export type RawResponse = { status: number; body: Buffer };

function requestOnce(
  url: string,
  accept: string,
  timeoutMs: number,
  redirects: number,
  tls: Record<string, unknown>
): Promise<RawResponse> {
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
          Connection: "close",
        },
        ...(secure ? tls : {}),
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
          requestOnce(next, accept, timeoutMs, redirects - 1, tls).then(
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

/**
 * One paced attempt. The TLS ladder is walked only while the failures are
 * genuine handshake problems; once a profile answers it is remembered and
 * every later error is thrown to the caller for a backoff retry.
 */
export async function rawGet(
  url: string,
  opts: { accept?: string; timeoutMs?: number; redirects?: number } = {}
): Promise<RawResponse> {
  const accept = opts.accept || "*/*";
  const timeoutMs = opts.timeoutMs ?? 90000;
  const redirects = opts.redirects ?? 5;

  let host = "";
  let secure = false;
  try {
    const u = new URL(url);
    host = u.host;
    secure = u.protocol === "https:";
  } catch {
    throw new Error("bad url: " + url);
  }

  await pace(host);

  if (!secure) {
    return requestOnce(url, accept, timeoutMs, redirects, {});
  }

  const known = hostProfile.get(host);

  // Known-good profile: use it alone. A reset here means "slow down",
  // not "wrong handshake", so let the caller back off.
  if (known !== undefined) {
    try {
      return await requestOnce(url, accept, timeoutMs, redirects, PROFILES[known].opts);
    } catch (e) {
      if (!isTlsProblem(e)) throw e;
      hostProfile.delete(host); // profile genuinely stopped working
    }
  }

  // Discovery: walk the ladder, but stop as soon as a failure is not a
  // handshake problem (no point hammering a rate-limited server).
  const errs: string[] = [];
  for (let i = 0; i < PROFILES.length; i++) {
    try {
      const r = await requestOnce(url, accept, timeoutMs, redirects, PROFILES[i].opts);
      hostProfile.set(host, i);
      return r;
    } catch (e) {
      errs.push(PROFILES[i].name + ": " + describeError(e));
      if (!isTlsProblem(e)) break;
      await pace(host);
    }
  }

  throw new Error(errs.join(" ; "));
}

export async function getText(
  url: string,
  opts: { accept?: string; timeoutMs?: number; tries?: number } = {}
): Promise<string> {
  const tries = opts.tries ?? 4;
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
      if (i < tries - 1) {
        await sleep(BACKOFF[Math.min(i, BACKOFF.length - 1)]);
      }
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
