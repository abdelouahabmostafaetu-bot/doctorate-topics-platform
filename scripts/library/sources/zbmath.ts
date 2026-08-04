// zbMATH Open — العمود الفقري للفهرس.
//
// لماذا هو الأهم؟ لأن كل وثيقة تحمل رموز MSC كتبها مراجع بشري
// متخصص — لا تخمين آلي. رمز MSC واحد يدخل المصنف من الطبقة الأولى
// بثقة 1.0، فلا تطابق كلمات ولا «Gathering Ecologies».
//
// zbMATH فهرس لا مكتبة ملفات: السجلات metadata-only عمدًا، والملف يأتي
// من Springer/DOAB/HAL ويندمج على المفتاح الموحد (doi/isbn). الرخصة CC-BY-SA 4.0.
//
// دروس من عينات حقيقية: لا يُفترض أبدًا أن حقلًا نص، فقد يكون كائنًا أو مصفوفة.
//   document_type : { code: "b", description: "book / book article" }
//   title         : { title, subtitle, original, addition }
//   language      : { languages: ["English"] }
//   msc[]         : { code: "68Q25", scheme: "msc2020", text }
//   source.book[] : { year: "1979", isbn: [ {…} ], publisher: null }
//   source.source : "A Series of Books… San Francisco: W. H. Freeman and Company. X, 338 p. (1979)."
//   editorial_contributions[] : { text: "<مراجعة خبير>", contribution_type: "review" }

import { fetchJson, HttpError, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://api.zbmath.org/v1/document/_search";
const PAGE_SIZE = 100;
const DELAY_MS = 400;

/** أطول ملخص نحتفظ به — مراجعات zbMATH قد تطول جدًا */
const MAX_ABSTRACT = 1500;

/** ناشرون نعرفهم بالاسم — يُقرأون من سطر المصدر الحر حين يكون الحقل فارغًا.
 * مهم لأن publisherTier يمنح 40 من 100 نقطة جودة. */
const KNOWN_PUBLISHERS: Array<[RegExp, string]> = [
	[/springer/i, "Springer"],
	[/birkh[aä]user/i, "Birkhäuser"],
	[/cambridge univ/i, "Cambridge University Press"],
	[/oxford univ/i, "Oxford University Press"],
	[/princeton univ/i, "Princeton University Press"],
	[/\bMIT Press\b/i, "MIT Press"],
	[/de gruyter/i, "De Gruyter"],
	[/world scientific/i, "World Scientific"],
	[/american mathematical society|\bAMS\b/i, "American Mathematical Society"],
	[/european mathematical society|EMS Press/i, "EMS Press"],
	[/soci[eé]t[eé] math[eé]matique de france/i, "Société Mathématique de France"],
	[/\bSIAM\b|society for industrial/i, "SIAM"],
	[/elsevier|north-holland/i, "Elsevier"],
	[/\bWiley\b/i, "Wiley"],
	[/CRC Press|Chapman/i, "CRC Press"],
	[/Academic Press/i, "Academic Press"],
	[/Clay Mathematics/i, "Clay Mathematics Institute"],
	[/Freeman and Company|W\. H\. Freeman/i, "W. H. Freeman"],
];

/**
 * zbMATH لا يضمن أنواع الأوراق: قد يكون الحقل نصًا هنا وكائنًا هناك.
 * درسان متعلمان: document_type كان كائنًا، وعناصر isbn كانت كائنات.
 * لذلك كل قراءة تمر من هنا بدل افتراض النوع حقلًا بحقل.
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

/** أول عنصر من مصفوفة (أو القيمة نفسها إن لم تكن مصفوفة) */
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
		// المفتاح name أولًا؛ لو كان العنصر نصًا مباشرًا نأخذه كما هو
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
 * عناصر isbn كائنات لا نصوص، وقد تحمل طباعيًا وإلكترونيًا معًا.
 * نفضل ذا الثلاثة عشر رقمًا لأنه مفتاح الدمج ومفتاح أغلفة OpenLibrary.
 */
function pickIsbn(d: ZbDoc): string | undefined {
	let ten: string | undefined;

	for (const entry of asArray(at(book(d), "isbn"))) {
		const raw = text(at(entry, "isbn")) || text(at(entry, "value")) || text(entry);
		for (const candidate of raw.split(/[^0-9Xx]+/)) {
			const digits = candidate.replace(/[^0-9Xx]/g, "");
			if (digits.length === 13) return digits;
			if (digits.length === 10 && !ten) ten = digits;
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
 * الناشر: الحقل المخصص أولًا، وهو غالبًا null، فنقرأ سطر المصدر الحر.
 * مثال: "… San Francisco: W. H. Freeman and Company. X, 338 p. (1979)."
 */
function pickPublisher(d: ZbDoc): string | undefined {
	const direct = clean(at(book(d), "publisher")) ?? clean(at(series(d), "publisher"));
	if (direct) return direct;

	const line = clean(at(d.source, "source"));
	if (!line) return undefined;

	for (const [pattern, name] of KNOWN_PUBLISHERS) {
		if (pattern.test(line)) return name;
	}

	// نمط "مدينة: ناشر." — نقف عند نقطة يتبعها ترقيم صفحات
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
 * dt:b يعني "book / book article" — فالرمز يشمل مقالات داخل كتب.
 * وجود ترقيم صفحات يعني أن السجل جزء من كتاب لا كتابًا — فنسميه فصلًا
 * وترفضه البوابة القائمة بلا تعديل فيها.
 */
function resolveType(d: ZbDoc): string {
	return clean(at(d.source, "pages")) ? "book-chapter" : "book";
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
