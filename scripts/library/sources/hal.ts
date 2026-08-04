// HAL — الأرشيف الفرنسي المفتوح. أقوى مصدر فرنسي عندنا.
//
// ميزتان حاسمتان:
//   • rows=10000 لكل طلب — أسرع 50 مرة من OpenAlex
//   • fileMain_s — رابط PDF مباشر جاهز
//
// docType_s: OUV = ouvrage (كتاب) · COUV = chapitre · DOUV = direction d'ouvrage.
// لا نأخذ THESE هنا: المستخدم طلب كتبًا فقط، والرسائل لها قسمها /theses.

import { fetchJson, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://api.archives-ouvertes.fr/search/";
const ROWS = 1000; // يمكن رفعه إلى 10000؛ 1000 ألطف بالخادم وأقل مخاطرة مقاطعة
const DELAY_MS = 500;

const FIELDS = [
	"docid",
	"title_s",
	"subTitle_s",
	"authFullName_s",
	"producedDateY_i",
	"publicationDateY_i",
	"doiId_s",
	"isbn_s",
	"publisher_s",
	"bookTitle_s",
	"abstract_s",
	"fileMain_s",
	"uri_s",
	"language_s",
	"docType_s",
	"openAccess_bool",
	"licence_s",
	"page_s",
].join(",");

type HalDoc = {
	docid?: string | number;
	title_s?: string[] | string;
	subTitle_s?: string[] | string;
	authFullName_s?: string[];
	producedDateY_i?: number;
	publicationDateY_i?: number;
	doiId_s?: string;
	isbn_s?: string[] | string;
	publisher_s?: string[] | string;
	bookTitle_s?: string[] | string;
	abstract_s?: string[] | string;
	fileMain_s?: string;
	uri_s?: string;
	language_s?: string[] | string;
	docType_s?: string;
	openAccess_bool?: boolean;
	licence_s?: string;
	page_s?: string;
};

type HalResponse = {
	response?: { numFound?: number; docs?: HalDoc[] };
	nextCursorMark?: string;
};

function one(v?: string[] | string): string | undefined {
	if (!v) return undefined;
	return Array.isArray(v) ? v[0] : v;
}

export const halSource: Source = {
	id: "hal",
	label: "HAL — الأرشيف الفرنسي المفتوح",
	ready: () => true,
	async *harvest(opts) {
		let cursor = opts.cursor ?? "*";
		let yielded = 0;
		const minYear = opts.minYear ?? 2004;

		while (true) {
			const url = `${ENDPOINT}?${new URLSearchParams({
				q: "domain_t:math",
				fq: `docType_s:(OUV OR COUV OR DOUV) AND producedDateY_i:[${minYear} TO *]`,
				fl: FIELDS,
				rows: String(ROWS),
				sort: "docid asc",
				cursorMark: cursor,
				wt: "json",
			})}`;

			const data = await fetchJson<HalResponse>(url);
			const docs = data.response?.docs ?? [];
			if (docs.length === 0) return;

			for (const d of docs) {
				const isbnRaw = one(d.isbn_s);

				const item: RawItem = {
					source: "hal",
					sourceId: d.docid ? String(d.docid) : undefined,
					type: d.docType_s ?? "OUV",
					title: one(d.title_s),
					subtitle: one(d.subTitle_s),
					authors: d.authFullName_s ?? [],
					year: d.producedDateY_i ?? d.publicationDateY_i,
					publisher: one(d.publisher_s),
					// للفصول: اسم الكتاب الأم يفيد كإشارة سلسلة
					series: one(d.bookTitle_s),
					isbn13: isbnRaw,
					doi: d.doiId_s,
					language: one(d.language_s),
					abstract: one(d.abstract_s),
					landingUrl: d.uri_s,
					// لا نقدم ملفًا إلا إن كان الوصول مفتوحًا فعلًا
					pdfUrl: d.openAccess_bool === false ? undefined : d.fileMain_s,
					license: d.licence_s,
				};

				yield item;
				yielded++;
				if (opts.limit && yielded >= opts.limit) return;
			}

			const next = data.nextCursorMark;
			// HAL يعيد نفس المؤشر عند النهاية
			if (!next || next === cursor) return;
			cursor = next;
			await opts.onCursor?.(next);
			await sleep(DELAY_MS);
		}
	},
};
