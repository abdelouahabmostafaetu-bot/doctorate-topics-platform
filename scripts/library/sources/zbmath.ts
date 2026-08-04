// zbMATH Open — العمود الفقري للفهرس.
//
// لماذا هذا المصدر هو الأهم؟ لأن كل وثيقة فيه تحمل رموز MSC كتبها
// مراجع بشري متخصص، لا تخمين آلي. رمز MSC واحد يدخل المصنف من الطبقة
// الأولى بثقة 1.0 — فلا كلمات مفتاحية ولا «Gathering Ecologies».
//
// zbMATH فهرس لا مكتبة ملفات: لا PDF ولا أغلفة هنا، والسجلات metadata-only
// عمدًا. الملف يأتي من Springer/DOAB/HAL ويندمج على المفتاح الموحد (doi/isbn).
// دور zbMATH هو ما لا يقدمه غيره: عنوان + مؤلفون + ناشر + سنة + تصنيف موثوق
// لكل كتاب رياضيات في العالم. البيانات برخصة CC-BY-SA 4.0.
//
// شكل الاستجابة تعلمناه من مرجع MaRDI4NFDI/python-zbMathRest2Oai.

import { fetchJson, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://api.zbmath.org/v1/document/_search";
const PAGE_SIZE = 100;
const DELAY_MS = 400;

// صيغة بحث zbMATH: dt:b = كتب فقط، py = سنة النشر، & = ومنطقية.
// إن رفضها الخادم يظهر الخطأ في التجربة الجافة فورًا ولا نحتاج تعديلًا هنا.
const SEARCH_STRING = (minYear: number, maxYear: number): string =>
	"dt:b & py:" + String(minYear) + "-" + String(maxYear);

type ZbLink = { type?: string; identifier?: string; url?: string };
type ZbMsc = { code?: string; scheme?: string; text?: string };
type ZbPublisher = string | { name?: string };
type ZbSourcePart = { year?: number; publisher?: ZbPublisher; title?: string; isbn?: string };
type ZbAuthor = { name?: string } | string;

type ZbDoc = {
	id?: number | string;
	title?: string;
	document_type?: string;
	contributors?: { authors?: ZbAuthor[] };
	authors?: ZbAuthor[];
	source?: { book?: ZbSourcePart[]; series?: ZbSourcePart[] };
	msc?: ZbMsc[];
	links?: ZbLink[];
	zbmath_url?: string;
	language?: string[] | string;
	year?: number;
	datestamp?: string;
};

type ZbResponse = { result?: ZbDoc[] | ZbDoc };

function one(v?: string[] | string): string | undefined {
	if (!v) return undefined;
	return Array.isArray(v) ? v[0] : v;
}

function pickAuthors(d: ZbDoc): string[] {
	const list = d.contributors?.authors ?? d.authors ?? [];
	const out: string[] = [];
	for (const a of list) {
		const name = typeof a === "string" ? a : a?.name;
		if (name && name.trim()) out.push(name.trim());
	}
	return out;
}

function pickMsc(d: ZbDoc): string[] {
	const out: string[] = [];
	for (const m of d.msc ?? []) {
		if (m.code && m.code.trim()) out.push(m.code.trim());
	}
	return out;
}

function pickYear(d: ZbDoc): number | undefined {
	return d.source?.book?.[0]?.year ?? d.source?.series?.[0]?.year ?? d.year;
}

function publisherName(p?: ZbPublisher): string | undefined {
	if (!p) return undefined;
	return typeof p === "string" ? p : p.name;
}

function pickPublisher(d: ZbDoc): string | undefined {
	return publisherName(d.source?.book?.[0]?.publisher) ?? publisherName(d.source?.series?.[0]?.publisher);
}

function pickIsbn(d: ZbDoc): string | undefined {
	const isbn = d.source?.book?.[0]?.isbn;
	return isbn ? isbn.replace(/[-\s]/g, "") : undefined;
}

function pickDoi(d: ZbDoc): string | undefined {
	for (const l of d.links ?? []) {
		if (l.type === "doi") return l.identifier ?? l.url;
	}
	return undefined;
}

export const zbmathSource: Source = {
	id: "zbmath",
	label: "zbMATH Open — الفهرس الرسمي برموز MSC",
	ready: () => true,
	async *harvest(opts) {
		const minYear = opts.minYear ?? 2004;
		const maxYear = new Date().getFullYear() + 1;
		let yielded = 0;
		let page = opts.cursor ? Number(opts.cursor) || 0 : 0;
		let previousFirstId: string | undefined;

		while (true) {
			const url =
				ENDPOINT +
				"?" +
				new URLSearchParams({
					search_string: SEARCH_STRING(minYear, maxYear),
					page: String(page),
					results_per_page: String(PAGE_SIZE),
				});

			const data = await fetchJson<ZbResponse>(url);
			const raw = data.result;
			const docs: ZbDoc[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];
			if (docs.length === 0) return;

			// حارس: إن تجاهل الخادم page وأعاد نفس الصفحة نتوقف بدل حلقة لا نهائية
			const firstId = docs[0]?.id != null ? String(docs[0].id) : undefined;
			if (page > 0 && firstId && firstId === previousFirstId) return;
			previousFirstId = firstId;

			for (const d of docs) {
				// الاستعلام يرشح الكتب، لكن نتأكد إن أرسل الخادم نوع الوثيقة
				const dt = (d.document_type ?? "").trim().toLowerCase();
				if (dt && dt !== "b" && dt !== "book" && dt !== "books") continue;

				const mscCodes = pickMsc(d);

				const item: RawItem = {
					source: "zbmath",
					sourceId: d.id != null ? String(d.id) : undefined,
					type: "book",
					title: (d.title ?? "").trim(),
					authors: pickAuthors(d),
					year: pickYear(d),
					publisher: pickPublisher(d),
					isbn13: pickIsbn(d),
					doi: pickDoi(d),
					language: one(d.language),
					landingUrl: d.zbmath_url,
					mscCodes: mscCodes.length > 0 ? mscCodes : undefined,
				};

				yield item;
				yielded++;
				if (opts.limit && yielded >= opts.limit) return;
			}

			page++;
			await opts.onCursor?.(String(page));
			if (docs.length < PAGE_SIZE) return; // آخر صفحة
			await sleep(DELAY_MS);
		}
	},
};
