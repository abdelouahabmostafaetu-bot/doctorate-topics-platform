// واجهة المصادر + جلب متين مع تراجع أسي.
// كل حاصد يُرجع مولّدًا غير متزامن حتى لا تمتلئ الذاكرة بمليون سجل.

import type { RawItem } from "./types";

export type HarvestOptions = {
	/** أقصى عدد سجلات يُقرأ (للتجربة) */
	limit?: number;
	/** موضع المتابعة من تشغيل سابق (cursor / resumptionToken / رقم بداية) */
	cursor?: string;
	/** أقدم سنة مطلوبة — تُمرّر للمصدر لتقليل النقل */
	minYear?: number;
	/** دالة تُنادى لحفظ نقطة المتابعة */
	onCursor?: (cursor: string) => Promise<void> | void;
};

export type Source = {
	/** معرف المصدر — يُخزّن في item.sources */
	id: string;
	/** اسم عربي للعرض والسجلات */
	label: string;
	/** هل المصدر جاهز؟ (مثلاً مفتاح API موجود) */
	ready: () => boolean;
	/** سبب عدم الجاهزية — رسالة واضحة للمشغّل */
	readyHint?: string;
	harvest: (opts: HarvestOptions) => AsyncGenerator<RawItem, void, void>;
};

export class HttpError extends Error {
	constructor(
		public status: number,
		public url: string,
		public body: string,
	) {
		super(`HTTP ${status} — ${url}`);
	}
}

const MAX_ATTEMPTS = 5;
const USER_AGENT =
	"DocMathDZ-Library/1.0 (+https://www.docmathdz.dev; abdelouahab.mostafa.etu@centre-univ-mila.dz)";

export function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * جلب مع تراجع أسي واحترام Retry-After.
 * الأخطاء 4xx (عدا 408/429) لا يُعاد محاولتها: المشكلة في طلبنا لا في الخادم.
 */
export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
	let lastErr: unknown;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const res = await fetch(url, {
				...init,
				headers: { "user-agent": USER_AGENT, ...(init.headers ?? {}) },
			});

			if (res.ok) return await res.text();

			const body = await res.text().catch(() => "");
			const retryable = res.status === 429 || res.status === 408 || res.status >= 500;
			if (!retryable) throw new HttpError(res.status, url, body.slice(0, 400));

			const retryAfter = Number(res.headers.get("retry-after"));
			const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
			console.warn(`  ↻ ${res.status} — إعادة بعد ${Math.round(waitMs / 1000)}ث (محاولة ${attempt}/${MAX_ATTEMPTS})`);
			await sleep(waitMs);
			lastErr = new HttpError(res.status, url, body.slice(0, 400));
		} catch (err) {
			if (err instanceof HttpError) throw err;
			// عطل شبكة — يستحق إعادة
			lastErr = err;
			await sleep(2 ** attempt * 1000);
		}
	}

	throw lastErr instanceof Error ? lastErr : new Error(`فشل الجلب: ${url}`);
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
	const text = await fetchText(url, {
		...init,
		headers: { accept: "application/json", ...(init.headers ?? {}) },
	});
	try {
		return JSON.parse(text) as T;
	} catch {
		throw new Error(`استجابة ليست JSON من ${url}: ${text.slice(0, 200)}`);
	}
}

/** استخراج أول سنة معقولة من نص تاريخ حرّ */
export function parseYear(raw?: string | number | null): number | undefined {
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
	if (!raw) return undefined;
	const m = String(raw).match(/(19|20)\d{2}/);
	return m ? Number(m[0]) : undefined;
}
