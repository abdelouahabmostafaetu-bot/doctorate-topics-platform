// DOAB — Directory of Open Access Books (نحو 86,000 كتاب محكّم مفتوح).
// عبر OAI-PMH: مستقر ومدعوم ويدعم المتابعة بـ resumptionToken.
//
// قارئ XML مصغّر مقصود: لا نريد إضافة تبعية XML للمشروع من أجل oai_dc
// البسيط، وحقول Dublin Core مسطحة ولا تحتاج محللًا كاملًا.

import { fetchText, parseYear, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://directory.doabooks.org/oai/request";
const DELAY_MS = 600;

function decodeEntities(s: string): string {
	return s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
		.replace(/&amp;/g, "&");
}

/** كل قيم وسم داخل مقطع XML */
function tagValues(xml: string, tag: string): string[] {
	const re = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9]+:)?${tag}>`, "g");
	const out: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml)) !== null) {
		const v = decodeEntities(m[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
		if (v) out.push(v);
	}
	return out;
}

function firstValue(xml: string, tag: string): string | undefined {
	return tagValues(xml, tag)[0];
}

/** تقسيم الاستجابة إلى سجلات */
function splitRecords(xml: string): string[] {
	const re = /<record(?:\s[^>]*)?>([\s\S]*?)<\/record>/g;
	const out: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(xml)) !== null) out.push(m[1]);
	return out;
}

function pickIsbn(identifiers: string[]): string | undefined {
	for (const id of identifiers) {
		const m = id.match(/(?:isbn[:\s]*)?((?:97[89])[-\s]?(?:\d[-\s]?){9}\d)/i);
		if (m) return m[1].replace(/[-\s]/g, "");
	}
	return undefined;
}

function pickDoi(identifiers: string[]): string | undefined {
	for (const id of identifiers) {
		const m = id.match(/10\.\d{4,9}\/[^\s"<>]+/);
		if (m) return m[0];
	}
	return undefined;
}

function pickUrls(identifiers: string[], relations: string[]): { landingUrl?: string; pdfUrl?: string } {
	const all = [...identifiers, ...relations];
	const pdfUrl = all.find((u) => /^https?:\/\//.test(u) && /\.pdf($|\?)/i.test(u));
	const landingUrl = all.find((u) => /^https?:\/\//.test(u) && !/\.pdf($|\?)/i.test(u));
	return { landingUrl, pdfUrl };
}

/** هل المواضيع رياضياتية؟ DOAB يغطي كل العلوم، فنرشّح محليًا */
const MATH_HINT =
	/mathemat|mathémat|matemat|algebra|algèbre|geometr|géométr|topolog|analysis|analyse|probabilit|statistic|statistiq|number\s+theory|combinator|equations?\s+diff|numerical/i;

function looksMathematical(rec: {
	title?: string;
	subjects: string[];
	abstract?: string;
}): boolean {
	if (rec.subjects.some((s) => MATH_HINT.test(s))) return true;
	if (rec.title && MATH_HINT.test(rec.title)) return true;
	return false;
}

export const doabSource: Source = {
	id: "doab",
	label: "DOAB — دليل الكتب مفتوحة الوصول",
	ready: () => true,
	async *harvest(opts) {
		let token = opts.cursor;
		let yielded = 0;

		while (true) {
			const params = token
				? new URLSearchParams({ verb: "ListRecords", resumptionToken: token })
				: new URLSearchParams({ verb: "ListRecords", metadataPrefix: "oai_dc" });

			const xml = await fetchText(`${ENDPOINT}?${params}`);
			const records = splitRecords(xml);
			if (records.length === 0) return;

			for (const rec of records) {
				const identifiers = tagValues(rec, "identifier");
				const relations = tagValues(rec, "relation");
				const subjects = tagValues(rec, "subject");
				const title = firstValue(rec, "title");
				const abstract = firstValue(rec, "description");

				if (!looksMathematical({ title, subjects, abstract })) continue;

				const { landingUrl, pdfUrl } = pickUrls(identifiers, relations);

				const item: RawItem = {
					source: "doab",
					sourceId: identifiers[0],
					// DOAB مكتبة كتب بالتعريف، والبوابة تتحقق من البقية
					type: "book",
					title,
					authors: tagValues(rec, "creator"),
					year: parseYear(firstValue(rec, "date")),
					publisher: firstValue(rec, "publisher"),
					isbn13: pickIsbn(identifiers),
					doi: pickDoi(identifiers),
					language: firstValue(rec, "language"),
					abstract,
					landingUrl,
					pdfUrl,
					license: firstValue(rec, "rights"),
				};

				yield item;
				yielded++;
				if (opts.limit && yielded >= opts.limit) return;
			}

			const next = firstValue(xml, "resumptionToken");
			if (!next) return;
			token = next;
			await opts.onCursor?.(next);
			await sleep(DELAY_MS);
		}
	},
};
