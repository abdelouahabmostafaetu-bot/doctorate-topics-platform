// Springer Nature — مصدرنا رقم واحد للكتب الحديثة المحكّمة.
//
// واجهتان، وكل واحدة تخدم طبقة مختلفة:
//   • Open Access API → كتب مفتوحة مع روابط PDF   (access: open)
//   • Meta API        → كل الكتب بما فيها التجارية (access: metadata-only)
//
// الأهم: Meta API يعيد حقل publicationName/seriesTitle، ومنه يستنتج
// detectLevel() المستوى الدراسي (ليسانس/ماستر/دكتوراه).

import { fetchJson, parseYear, sleep, type HarvestOptions, type Source } from "../source";
import type { RawItem } from "../types";

const OA_ENDPOINT = "https://api.springernature.com/openaccess/json";
const META_ENDPOINT = "https://api.springernature.com/meta/v2/json";

/** أقصى ما تسمح به الواجهة لكل طلب */
const PAGE_SIZE = 100;
/** مهلة مهذّبة بين الطلبات */
const DELAY_MS = 400;

type SpringerRecord = {
	title?: string;
	subtitle?: string;
	publicationName?: string;
	doi?: string;
	isbn?: string;
	printIsbn?: string;
	electronicIsbn?: string;
	publisher?: string;
	publicationDate?: string;
	onlineDate?: string;
	coverDate?: string;
	abstract?: string | { p?: string | string[] };
	language?: string;
	contentType?: string;
	publicationType?: string;
	genre?: string | string[];
	subjects?: string[];
	creators?: Array<{ creator?: string }>;
	url?: Array<{ format?: string; value?: string; platform?: string }>;
	openaccess?: string | boolean;
	copyright?: string;
	seriesTitle?: string;
};

type SpringerResponse = {
	records?: SpringerRecord[];
	result?: Array<{ total?: string; start?: string; pageLength?: string }>;
};

function flatAbstract(a: SpringerRecord["abstract"]): string | undefined {
	if (!a) return undefined;
	if (typeof a === "string") return a;
	const p = a.p;
	if (!p) return undefined;
	return Array.isArray(p) ? p.join(" ") : p;
}

function pickPdf(rec: SpringerRecord): string | undefined {
	const pdf = rec.url?.find((u) => u.format === "pdf" && u.value);
	return pdf?.value;
}

/** رابط DOI قياسي */
function doiUrl(doi?: string): string | undefined {
	return doi ? "https://doi.org/" + doi : undefined;
}

function pickLanding(rec: SpringerRecord): string | undefined {
	const html = rec.url?.find((u) => (u.format === "html" || !u.format) && u.value);
	if (html?.value) return html.value;
	return doiUrl(rec.doi);
}

/** نوع السجل كما تفهمه البوابة — نمرر book فقط لما هو كتاب حقًا */
function resolveType(rec: SpringerRecord): string {
	const parts = [
		rec.contentType ?? "",
		rec.publicationType ?? "",
		Array.isArray(rec.genre) ? rec.genre.join(" ") : (rec.genre ?? ""),
	];
	const t = parts.join(" ").toLowerCase();

	if (t.includes("chapter")) return "book-chapter";
	if (t.includes("book")) return "book";
	if (t.includes("journal") || t.includes("article")) return "article";
	return rec.contentType ?? "unknown";
}

function toRawItem(rec: SpringerRecord, source: string, forceMetadataOnly: boolean): RawItem {
	const isbn13 = rec.electronicIsbn ?? rec.printIsbn ?? rec.isbn;
	const pdfUrl = forceMetadataOnly ? undefined : pickPdf(rec);

	return {
		source,
		sourceId: rec.doi,
		type: resolveType(rec),
		title: rec.title,
		subtitle: rec.subtitle,
		authors: (rec.creators ?? []).map((c) => c.creator ?? "").filter(Boolean),
		year: parseYear(rec.publicationDate ?? rec.coverDate ?? rec.onlineDate),
		publisher: rec.publisher ?? "Springer",
		// السلسلة: مفتاح استنتاج المستوى الدراسي
		series: rec.seriesTitle ?? rec.publicationName,
		isbn13,
		doi: rec.doi,
		language: rec.language,
		abstract: flatAbstract(rec.abstract),
		landingUrl: pickLanding(rec),
		pdfUrl,
		license: rec.copyright,
	};
}

async function* harvestEndpoint(
	endpoint: string,
	apiKey: string,
	sourceId: string,
	query: string,
	opts: HarvestOptions,
	forceMetadataOnly: boolean,
): AsyncGenerator<RawItem, void, void> {
	let start = Number(opts.cursor ?? "1");
	if (!Number.isFinite(start) || start < 1) start = 1;

	let yielded = 0;

	while (true) {
		const params = new URLSearchParams({
			q: query,
			api_key: apiKey,
			p: String(PAGE_SIZE),
			s: String(start),
		});

		const data = await fetchJson<SpringerResponse>(endpoint + "?" + params.toString());
		const records = data.records ?? [];
		if (records.length === 0) return;

		for (const rec of records) {
			yield toRawItem(rec, sourceId, forceMetadataOnly);
			yielded++;
			if (opts.limit && yielded >= opts.limit) return;
		}

		start += records.length;
		await opts.onCursor?.(String(start));

		const total = Number(data.result?.[0]?.total ?? 0);
		if (total && start > total) return;
		if (records.length < PAGE_SIZE) return;

		await sleep(DELAY_MS);
	}
}

/** Springer لا يدعم مدى سنوات، فنبني قائمة OR من السنوات */
function yearClause(minYear: number): string {
	const thisYear = new Date().getFullYear();
	const years: string[] = [];
	for (let y = minYear; y <= thisYear; y++) years.push("year:" + String(y));
	return "(" + years.join(" OR ") + ")";
}

function mathBooksQuery(minYear: number): string {
	return 'subject:"Mathematics" AND type:Book AND ' + yearClause(minYear);
}

/** الكتب المفتوحة — مع روابط PDF */
export const springerOaSource: Source = {
	id: "springer-oa",
	label: "Springer — مفتوح الوصول",
	ready: () => Boolean(process.env.SPRINGER_OA_KEY),
	readyHint: "أضف SPRINGER_OA_KEY إلى .env أو أسرار المستودع",
	async *harvest(opts) {
		const key = process.env.SPRINGER_OA_KEY;
		if (!key) throw new Error("SPRINGER_OA_KEY مفقود");

		yield* harvestEndpoint(
			OA_ENDPOINT,
			key,
			"springer-oa",
			mathBooksQuery(opts.minYear ?? 2004),
			opts,
			false,
		);
	},
};

/** كل الكتب — بيانات وسلاسل فقط، بلا أي رابط تحميل */
export const springerMetaSource: Source = {
	id: "springer-meta",
	label: "Springer — بيانات وصفية",
	ready: () => Boolean(process.env.SPRINGER_META_KEY),
	readyHint: "أضف SPRINGER_META_KEY إلى .env أو أسرار المستودع",
	async *harvest(opts) {
		const key = process.env.SPRINGER_META_KEY;
		if (!key) throw new Error("SPRINGER_META_KEY مفقود");

		// forceMetadataOnly = true: لا نحتفظ بروابط PDF من واجهة Meta
		yield* harvestEndpoint(
			META_ENDPOINT,
			key,
			"springer-meta",
			mathBooksQuery(opts.minYear ?? 2004),
			opts,
			true,
		);
	},
};
