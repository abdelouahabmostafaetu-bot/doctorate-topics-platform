// zbMATH Open — العمود الفقري للفهرس.
//
// لماذا هو الأهم؟ لأن كل وثيقة تحمل رموز MSC كتبها مراجع بشري
// متخصص — لا تخمين آلي. رمز MSC واحد يدخل المصنف من الطبقة الأولى
// بثقة 1.0، فلا تطابق كلمات ولا «Gathering Ecologies».
//
// zbMATH فهرس لا مكتبة ملفات: السجلات metadata-only عمدًا، والملف يأتي
// من Springer/DOAB/HAL ويندمج على المفتاح الموحد (doi/isbn). الرخصة CC-BY-SA 4.0.
//
// دروس من عينات حقيقية: لا يُفترض أبدًا أن حقلًا نص، ولا أن قيمة موجودة نقية.
//   document_type : { code: "b", description: "book / book article" }
//   title         : { title, subtitle, original, addition }
//   language      : { languages: ["English"] }
//   msc[]         : { code: "68Q25", scheme: "msc2020", text }
//   source.book[] : { book_id, year: "1979", isbn: [ {…} ], publisher: "Cambridge: CUP" }
//   source.source : "A Series of Books… San Francisco: W. H. Freeman and Company. X, 338 p. (1979)."
//   editorial_contributions[] : { text: "<مراجعة خبير>", contribution_type: "review" }

import { fetchJson, HttpError, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://api.zbmath.org/v1/document/_search";
const PAGE_SIZE = 100;
const DELAY_MS = 400;

/** أطول ملخص نحتفظ به — مراجعات zbMATH قد تطول جدًا */
const MAX_ABSTRACT = 1500;

/** ناشرون نعرفهم بالاسم — يوحّدون التسمية أينما جاءت.
 * مهم لأن publisherTier يمنح 40 من 100 نقطة جودة. */
const KNOWN_PUBLISHERS: Array<[RegExp, string]> = [
	[/birkh[aä]user/i, "Birkhäuser"],
	[/springer/i, "Springer"],
	[/cambridge univ|\bCUP\b/i, "Cambridge University Press"],
	[/oxford univ|\bOUP\b/i, "Oxford University Press"],
	[/princeton univ/i, "Princeton University Press"],
	[/\bMIT Press\b/i, "MIT Press"],
	[/de gruyter/i, "De Gruyter"],
	[/world scientific/i, "World Scientific"],
	[/american mathematical society|\bAMS\b/i, "American Mathematical Society"],
	[/european mathematical society|EMS Press/i, "EMS Press"],
	[/soci[eé]t[eé] math[eé]matique de france|\bSMF\b/i, "Société Mathématique de France"],
	[/\bSIAM\b|society for industrial/i, "SIAM"],
	[/elsevier|north-holland/i, "Elsevier"],
	[/\bWiley\b/i, "Wiley"],
	[/CRC Press|Chapman/i, "CRC Press"],
	[/Academic Press/i, "Academic Press"],
	[/Clay Mathematics/i, "Clay Mathematics Institute"],
	[/Freeman and Company|W\. H\. Freeman/i, "W. H. Freeman"],
];

/** معرف دولي من ثلاثة عشر رقمًا مع فواصل محتملة */
const ISBN13_RE = /97[89](?:[-\s]?\d){10}/g;
/** معرف من عشرة: تسعة أرقام ورمز تحقق قد يكون X */
const ISBN10_RE = /\d(?:[-\s]?\d){8}[-\s]?[\dXx]/g;

/**
 * zbMATH لا يضمن أنواع الأوراق: قد يكون الحقل نصًا هنا وكائنًا هناك.
 * درسان متعلمان: document_type كان كائنًا، وعناصر isbn كانت كائنات.
 */
function text(v: unknown): string {
	if (v == null) return "";
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	if (Array.isArray(v)) return v.map(text).filter(Boolean).join(" ");
	if (typeof v === "object") {
		return Object.values(v as Record<string, unknown>)
			.map(text)
			.filter(Boolean)
			.join(" ");
	}
	return "";
}

/** نص مقلّم أو undefined — لا نسمح بسلاسل فارغة تمر كأنها قيم */
function clean(v: unknown): string | undefined {
	const t = text(v).replace(/\s+/g, " ").trim();
	return t.length > 0 ? t : undefined;
}

function asYear(v: unknown): number | undefined {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	const m = text(v).match(/(19|20)\d{2}/);
	return m ? Number(m[0]) : undefined;
}

type Dict = Record<string, unknown>;

type ZbDoc = Dict & {
	id?: unknown;
	identifier?: unknown;
	document_type?: unknown;
	title?: unknown;
	contributors?: unknown;
	source?: unknown;
	msc?: unknown;
	links?: unknown;
	language?: unknown;
	editorial_contributions?: unknown;
	year?: unknown;
	zbmath_url?: unknown;
};

type ZbResponse = {
	result?: ZbDoc[] | ZbDoc | null;
	status?: { nr_total_results?: number } | null;
};

/** قراءة مفتاح من كائن مجهول الشكل */
function at(v: unknown, key: string): unknown {
	if (v && typeof v === "object" && !Array.isArray(v)) return (v as Dict)[key];
	return undefined;
}

function firstOf(v: unknown): unknown {
	if (Array.isArray(v)) return v[0];
	return v;
}

function asArray(v: unknown): unknown[] {
	if (Array.isArray(v)) return v;
	return v == null ? [] : [v];
}

const book = (d: ZbDoc): unknown => firstOf(at(d.source, "book"));
const series = (d: ZbDoc): unknown => firstOf(at(d.source, "series"));

function pickAuthors(d: ZbDoc): string[] {
	const authors = asArray(at(d.contributors, "authors"));
	const editors = asArray(at(d.contributors, "editors"));
	const list = authors.length > 0 ? authors : editors;

	const out: string[] = [];
	for (const a of list) {
		const name = clean(at(a, "name")) ?? (typeof a === "string" ? clean(a) : undefined);
		if (name) out.push(name);
	}
	return out;
}

function pickMsc(d: ZbDoc): string[] {
	const out: string[] = [];
	for (const m of asArray(d.msc)) {
		const code = clean(at(m, "code")) ?? (typeof m === "string" ? clean(m) : undefined);
		if (code) out.push(code);
	}
	return out;
}

/**
 * المعرف الدولي مفتاح مزدوج: به نجلب الغلاف من OpenLibrary، وبه يندمج سجل
 * zbMATH مع نسخة Springer أو DOAB فيرث ملفها. فقدانه يحبس الفهرس كله
 * في «بيانات فقط» — ولذلك نطابق النمط كاملًا ثم ننزع الفواصل، لا العكس.
 */
function pickIsbn(d: ZbDoc): string | undefined {
	let ten: string | undefined;

	for (const entry of asArray(at(book(d), "isbn"))) {
		const raw = clean(entry);
		if (!raw) continue;

		const thirteen = raw.match(ISBN13_RE);
		if (thirteen && thirteen[0]) return thirteen[0].replace(/[^0-9]/g, "");

		if (!ten) {
			const short = raw.match(ISBN10_RE);
			if (short && short[0]) {
				const digits = short[0].replace(/[^0-9Xx]/g, "").toUpperCase();
				if (digits.length === 10) ten = digits;
			}
		}
	}
	return ten;
}

function pickDoi(d: ZbDoc): string | undefined {
	for (const l of asArray(d.links)) {
		if (text(at(l, "type")).toLowerCase() === "doi") {
			const v = clean(at(l, "identifier")) ?? clean(at(l, "url"));
			if (v) return v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
		}
	}
	return undefined;
}

/** مراجعة الخبير تقوم مقام الملخص — وهي أفضل من ملخص الناشر عادةً */
function pickAbstract(d: ZbDoc): string | undefined {
	const list = asArray(d.editorial_contributions);
	const review =
		list.find((c) => text(at(c, "contribution_type")).toLowerCase() === "review") ?? list[0];
	const body = clean(at(review, "text"));
	return body ? body.slice(0, MAX_ABSTRACT) : undefined;
}

/**
 * zbMATH يكتب الناشر بصيغة "مدينة: ناشر" حتى في الحقل المخصص
 * ("Cambridge: Cambridge University Press"). إبقاء المدينة يفتت المرشحات
 * ويجعل الناشر الواحد يبدو ناشرين، فنوحّد كل قيمة من أي مصدر جاءت.
 */
function normalizePublisher(value: string): string {
	for (const [pattern, name] of KNOWN_PUBLISHERS) {
		if (pattern.test(value)) return name;
	}
	return value.replace(/^[^:]{2,40}:\s*/, "").trim() || value;
}

function pickPublisher(d: ZbDoc): string | undefined {
	const direct = clean(at(book(d), "publisher")) ?? clean(at(series(d), "publisher"));
	if (direct) return normalizePublisher(direct);

	const line = clean(at(d.source, "source"));
	if (!line) return undefined;

	for (const [pattern, name] of KNOWN_PUBLISHERS) {
		if (pattern.test(line)) return name;
	}

	const m = line.match(/:\s*(.{3,70}?)\.\s+(?=[IVXLCivxlc\d])/);
	return m ? m[1].trim() : undefined;
}

/** السلسلة تفيد detectLevel لاستنتاج المستوى (Graduate Texts، Lecture Notes…) */
function pickSeries(d: ZbDoc): string | undefined {
	const direct = clean(at(series(d), "title"));
	if (direct) return direct;

	const line = clean(at(d.source, "source"));
	if (!line) return undefined;

	const head = line.split(". ")[0]?.trim();
	if (!head || head.includes(":") || head.length < 8 || head.length > 90) return undefined;
	return head;
}

function pickLanguage(d: ZbDoc): string | undefined {
	const first = clean(firstOf(at(d.language, "languages"))) ?? clean(d.language);
	if (!first) return undefined;

	const map: Record<string, string> = {
		english: "en",
		french: "fr",
		german: "de",
		arabic: "ar",
		spanish: "es",
		italian: "it",
		russian: "ru",
		portuguese: "pt",
		chinese: "zh",
		japanese: "ja",
	};
	return map[first.toLowerCase()] ?? first;
}

/**
 * dt:b يعني "book / book article" — فالرمز يجمع الكتاب والمقال داخل الكتاب.
 *
 * الفارق القاطع هو الهوية لا الصفحات: في الكتاب الكامل يكون
 * source.book[].book_id مساويًا لـ id السجل نفسه (السجل هو ذلك الكتاب)،
 * أما المقال فيشير book_id إلى الكتاب الحاوي فيختلف عن معرفه.
 */
function resolveType(d: ZbDoc): string {
	const ownId = clean(d.id);
	const containerId = clean(at(book(d), "book_id"));
	if (ownId && containerId && ownId !== containerId) return "book-chapter";

	const pages = clean(at(d.source, "pages"));
	if (pages && /^\d+\s*[-–]\s*\d+$/.test(pages)) return "book-chapter";

	return "book";
}

function toRawItem(d: ZbDoc): RawItem {
	const mscCodes = pickMsc(d);

	return {
		source: "zbmath",
		sourceId: clean(d.identifier) ?? clean(d.id),
		type: resolveType(d),
		title: clean(at(d.title, "title")) ?? clean(at(d.title, "original")) ?? clean(d.title),
		subtitle: clean(at(d.title, "subtitle")),
		authors: pickAuthors(d),
		year: asYear(at(book(d), "year")) ?? asYear(d.year) ?? asYear(at(series(d), "year")),
		publisher: pickPublisher(d),
		series: pickSeries(d),
		isbn13: pickIsbn(d),
		doi: pickDoi(d),
		language: pickLanguage(d),
		abstract: pickAbstract(d),
		landingUrl: clean(d.zbmath_url),
		mscCodes: mscCodes.length > 0 ? mscCodes : undefined,
	};
}

export const zbmathSource: Source = {
	id: "zbmath",
	label: "zbMATH Open — الفهرس الرسمي برموز MSC",
	ready: () => true,
	async *harvest(opts) {
		const minYear = opts.minYear ?? 2004;
		const maxYear = new Date().getFullYear() + 1;

		// الترشيح عند الخادم حتى لا ننقل كتب ما قبل 2004 عبر الشبكة
		let searchString = "dt:b & py:" + String(minYear) + "-" + String(maxYear);
		let triedFallback = false;

		let yielded = 0;
		let page = opts.cursor ? Number(opts.cursor) || 0 : 0;
		let previousFirstId: string | undefined;
		let announced = false;

		while (true) {
			const url =
				ENDPOINT +
				"?" +
				new URLSearchParams({
					search_string: searchString,
					page: String(page),
					results_per_page: String(PAGE_SIZE),
				});

			let data: ZbResponse;
			try {
				data = await fetchJson<ZbResponse>(url);
			} catch (err) {
				// رُفضت صيغة مدى السنوات؟ نعود لاستعلام بسيط وترشح البوابة السنوات محليًا
				if (!triedFallback && err instanceof HttpError && err.status >= 400 && err.status < 500) {
					triedFallback = true;
					searchString = "dt:b";
					console.warn("  ↻ zbMATH رفض مدى السنوات — نعود لاستعلام dt:b والترشيح محليًا");
					continue;
				}
				throw err;
			}

			if (!announced) {
				const total = data.status?.nr_total_results;
				if (typeof total === "number") {
					console.log("  ℹ zbMATH يعلن " + total.toLocaleString("en") + " سجلًا مطابقًا");
				}
				announced = true;
			}

			const raw = data.result;
			const docs: ZbDoc[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];
			if (docs.length === 0) return;

			// حارس: لو تجاهل الخادم page وأعاد نفس الصفحة نتوقف بدل دوران لا ينتهي
			const firstId = clean(docs[0]?.id);
			if (page > 0 && firstId && firstId === previousFirstId) return;
			previousFirstId = firstId;

			for (const d of docs) {
				yield toRawItem(d);
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
