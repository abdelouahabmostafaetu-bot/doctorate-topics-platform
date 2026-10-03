const DEFAULT_TIMEOUT_MS = 30_000;

export type FessPdfKind = "exam" | "solution" | "results" | "other";

export type FessPdfResult = {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  domain: string;
  description: string;
  contentType: string;
  kind: FessPdfKind;
  confidence: "verified" | "likely";
  score: number;
  lastModified: string | null;
};

export type FessSearchResult = {
  configured: boolean;
  available: boolean;
  query: string;
  total: number;
  tookMs: number | null;
  results: FessPdfResult[];
  error?: string;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  return "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstText(source: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return "";
}

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function getFessConfig() {
  const baseUrl = cleanBaseUrl(process.env.FESS_BASE_URL || "");
  const adminToken = (process.env.FESS_ADMIN_API_TOKEN || "").trim();
  const enabled = process.env.FESS_ENABLED !== "false" && Boolean(baseUrl);
  const parsedTimeout = Number(process.env.FESS_REQUEST_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : DEFAULT_TIMEOUT_MS;
  return { baseUrl, adminToken, enabled, timeoutMs };
}

async function fessFetch(
  path: string,
  init: RequestInit = {},
  admin = false,
): Promise<Response> {
  const config = getFessConfig();
  if (!config.enabled) throw new Error("FESS_NOT_CONFIGURED");
  if (admin && !config.adminToken) throw new Error("FESS_ADMIN_TOKEN_MISSING");

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (admin) headers.set("Authorization", `Bearer ${config.adminToken}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(config.timeoutMs),
  });
}

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "ref"]) {
      url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function kindFor(title: string, url: string): FessPdfKind {
  const haystack = `${title} ${decodeURIComponent(url)}`.toLowerCase();
  if (
    /\b(solution|solutions|answer|answers|key|marking|corrig[eé]|correction|حلول?|اجابة|إجابة)\b/i.test(
      haystack,
    )
  ) {
    return "solution";
  }
  if (
    /\b(result|results|ranking|scores?|نتائج|ترتيب)\b/i.test(haystack)
  ) {
    return "results";
  }
  if (
    /\b(exam|paper|problem|problems|test|olympiad|competition|contest|اختبار|امتحان|مسائل|مسابقة)\b/i.test(
      haystack,
    )
  ) {
    return "exam";
  }
  return "other";
}

function mapPdfResult(rawValue: unknown, index: number): FessPdfResult | null {
  const raw = record(rawValue);
  const url = normalizeUrl(
    firstText(raw, ["url", "url_link", "link", "content_url"]),
  );
  if (!/^https?:\/\//i.test(url)) return null;

  const title =
    firstText(raw, ["title", "content_title", "filename", "file_name"]) ||
    (() => {
      try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || "PDF");
      } catch {
        return "PDF";
      }
    })();
  const contentType = firstText(raw, [
    "content_type",
    "mimetype",
    "mime_type",
    "filetype",
  ]);
  const fileType = firstText(raw, ["filetype", "file_type"]);
  const isPdfUrl = /\.pdf(?:$|[?#])/i.test(url);
  const isPdfMetadata =
    /application\/pdf|pdf/i.test(contentType) || /^pdf$/i.test(fileType);
  if (!isPdfUrl && !isPdfMetadata) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const score =
    (parsed.protocol === "https:" ? 20 : 8) +
    (isPdfUrl ? 35 : 0) +
    (isPdfMetadata ? 35 : 0) +
    (/\.edu(?:\.|$)|\.ac(?:\.|$)|university|olymp/i.test(parsed.hostname)
      ? 10
      : 0);
  const description = firstText(raw, [
    "content_description",
    "description",
    "digest",
    "content",
  ])
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 260);

  return {
    id: firstText(raw, ["doc_id", "_id", "id"]) || `${parsed.hostname}-${index}`,
    title: title.replace(/\s+/g, " ").slice(0, 220),
    url,
    displayUrl: `${parsed.hostname}${decodeURIComponent(parsed.pathname)}`,
    domain: parsed.hostname.replace(/^www\./, ""),
    description,
    contentType: contentType || (isPdfUrl ? "application/pdf" : "PDF"),
    kind: kindFor(title, url),
    confidence: isPdfUrl && isPdfMetadata ? "verified" : "likely",
    score,
    lastModified:
      firstText(raw, ["last_modified", "lastModified", "timestamp"]) || null,
  };
}

function extractSearchPayload(payload: unknown) {
  const root = record(payload);
  const response = record(root.response);
  const data = record(root.data);
  const body =
    Object.keys(response).length > 0
      ? response
      : Object.keys(data).length > 0
        ? data
        : root;
  const list =
    (Array.isArray(body.result) && body.result) ||
    (Array.isArray(body.results) && body.results) ||
    (Array.isArray(body.data) && body.data) ||
    (Array.isArray(root.data) && root.data) ||
    [];
  return {
    list,
    total: numberValue(
      body.record_count ??
        body.total ??
        body.total_hits ??
        root.record_count ??
        list.length,
    ),
    tookMs:
      numberValue(body.exec_time ?? body.took ?? root.exec_time) || null,
  };
}

export async function searchFessPdfs(options: {
  query?: string;
  start?: number;
  size?: number;
} = {}): Promise<FessSearchResult> {
  const config = getFessConfig();
  const query = (options.query || "").trim();
  if (!config.enabled) {
    return {
      configured: false,
      available: false,
      query,
      total: 0,
      tookMs: null,
      results: [],
      error: "Fess غير مضبوط بعد.",
    };
  }

  const start = Math.max(0, Math.floor(options.start || 0));
  const size = Math.min(100, Math.max(1, Math.floor(options.size || 30)));
  const fessQuery = query ? `${query} filetype:pdf` : "filetype:pdf";
  const params = new URLSearchParams({
    q: fessQuery,
    start: String(start),
    num: String(size),
  });

  try {
    const response = await fessFetch(`/api/v2/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`FESS_SEARCH_${response.status}`);
    }
    const payload = await response.json();
    const extracted = extractSearchPayload(payload);
    const seen = new Set<string>();
    const results = extracted.list
      .map(mapPdfResult)
      .filter((item): item is FessPdfResult => Boolean(item))
      .filter((item) => {
        const key = item.url.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score);

    return {
      configured: true,
      available: true,
      query,
      total: extracted.total || results.length,
      tookMs: extracted.tookMs,
      results,
    };
  } catch (error) {
    console.error("[fess] search failed:", error);
    return {
      configured: true,
      available: false,
      query,
      total: 0,
      tookMs: null,
      results: [],
      error: "تعذّر الاتصال بمحرك الاكتشاف حاليًا.",
    };
  }
}

function extractAdminList(payload: unknown): UnknownRecord[] {
  const root = record(payload);
  const candidates = [
    root.data,
    root.result,
    record(root.response).data,
    record(root.response).result,
  ];
  const found = candidates.find(Array.isArray);
  return (found || []).map(record);
}

export async function getFessAdminOverview() {
  const config = getFessConfig();
  if (!config.enabled || !config.adminToken) {
    return {
      configured: config.enabled,
      adminConfigured: Boolean(config.adminToken),
      available: false,
      webConfigs: [] as UnknownRecord[],
      schedulers: [] as UnknownRecord[],
      error: "إعدادات إدارة Fess غير مكتملة.",
    };
  }

  try {
    const [webResponse, schedulerResponse] = await Promise.all([
      fessFetch("/api/admin/webconfig/settings?size=100", {}, true),
      fessFetch("/api/admin/scheduler/settings?size=100", {}, true),
    ]);
    if (!webResponse.ok || !schedulerResponse.ok) {
      throw new Error(
        `FESS_ADMIN_${webResponse.status}_${schedulerResponse.status}`,
      );
    }
    return {
      configured: true,
      adminConfigured: true,
      available: true,
      webConfigs: extractAdminList(await webResponse.json()),
      schedulers: extractAdminList(await schedulerResponse.json()),
    };
  } catch (error) {
    console.error("[fess] admin overview failed:", error);
    return {
      configured: true,
      adminConfigured: true,
      available: false,
      webConfigs: [] as UnknownRecord[],
      schedulers: [] as UnknownRecord[],
      error: "تعذّر الوصول إلى واجهة إدارة Fess.",
    };
  }
}

export async function startFessScheduler(id: string) {
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("INVALID_SCHEDULER_ID");
  }
  const response = await fessFetch(
    `/api/admin/scheduler/${encodeURIComponent(id)}/start`,
    { method: "PUT" },
    true,
  );
  if (!response.ok) throw new Error(`FESS_SCHEDULER_${response.status}`);
  return response.json().catch(() => ({ ok: true }));
}

function safeAuditUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export type PdfAuditItem = {
  url: string;
  title: string;
  ok: boolean;
  status: number | null;
  method: "HEAD" | "RANGE" | "SKIPPED";
  contentType: string;
  reason: string;
};

async function auditOnePdf(item: FessPdfResult): Promise<PdfAuditItem> {
  const url = safeAuditUrl(item.url);
  if (!url) {
    return {
      url: item.url,
      title: item.title,
      ok: false,
      status: null,
      method: "SKIPPED",
      contentType: "",
      reason: "رابط غير آمن أو غير صالح",
    };
  }

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "DocMathDZ-PDF-Auditor/1.0" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const headType = head.headers.get("content-type") || "";
    if (head.ok && /application\/pdf/i.test(headType)) {
      return {
        url: item.url,
        title: item.title,
        ok: true,
        status: head.status,
        method: "HEAD",
        contentType: headType,
        reason: "أكد الخادم أن الملف PDF",
      };
    }

    const range = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        Range: "bytes=0-7",
        Accept: "application/pdf,*/*",
        "User-Agent": "DocMathDZ-PDF-Auditor/1.0",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const bytes = new Uint8Array(await range.arrayBuffer());
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5));
    const rangeType = range.headers.get("content-type") || "";
    const ok =
      range.ok &&
      (/application\/pdf/i.test(rangeType) || signature === "%PDF-");
    return {
      url: item.url,
      title: item.title,
      ok,
      status: range.status,
      method: "RANGE",
      contentType: rangeType,
      reason: ok ? "تم التحقق من توقيع PDF" : "لم يظهر توقيع PDF صحيح",
    };
  } catch {
    return {
      url: item.url,
      title: item.title,
      ok: false,
      status: null,
      method: "RANGE",
      contentType: "",
      reason: "انتهت المهلة أو رفض المصدر الطلب",
    };
  }
}

export async function auditFessPdfs(query = "", limit = 12) {
  const search = await searchFessPdfs({ query, size: Math.min(30, limit * 2) });
  const candidates = search.results.slice(0, Math.min(20, Math.max(1, limit)));
  const items: PdfAuditItem[] = [];
  for (let index = 0; index < candidates.length; index += 4) {
    items.push(
      ...(await Promise.all(candidates.slice(index, index + 4).map(auditOnePdf))),
    );
  }
  return {
    search,
    checked: items.length,
    valid: items.filter((item) => item.ok).length,
    invalid: items.filter((item) => !item.ok).length,
    items,
  };
}