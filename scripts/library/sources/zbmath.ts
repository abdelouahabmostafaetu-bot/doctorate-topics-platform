// zbMATH Open — العمود الفقري للفهرس.
//
// لماذا هو الأهم؟ لأن كل وثيقة تحمل رموز MSC كتبها مراجع بشري
// متخصص — لا تخمين آلي. رمز MSC واحد يدخل المصنف من الطبقة الأولى
// بثقة 1.0، فلا تطابق كلمات ولا «Gathering Ecologies».
//
// zbMATH فهرس لا مكتبة ملفات: السجلات metadata-only عمدًا، والملف يأتي
// من Springer/DOAB/HAL ويندمج على المفتاح الموحد (doi/isbn). الرخصة CC-BY-SA 4.0.
//
// شكل الاستجابة مأخوذ من عينة حقيقية لا من تخمين:
//   document_type : { code: "b", description: "book / book article" }
//   title         : { title, subtitle, original, addition }
//   language      : { languages: ["English"] }
//   msc[]         : { code: "68Q25", scheme: "msc2020", text: "..." }
//   source.book[] : { year: "1979", isbn: [], publisher: null }
//   source.source : "A Series of Books... San Francisco: W. H. Freeman and Company. X, 338 p. (1979)."
//   editorial_contributions[] : { text: "<مراجعة خبير كاملة>", contribution_type: "review" }

import { fetchJson, HttpError, sleep, type Source } from "../source";
import type { RawItem } from "../types";

const ENDPOINT = "https://api.zbmath.org/v1/document/_search";
const PAGE_SIZE = 100;
const DELAY_MS = 400;

/** أطول ملخص نحتفظ به — مراجعات zbMATH قد تطول جدًا */
const MAX_ABSTRACT = 1500;

/** ناشرون نعرفهم بالاسم — نقرأهم من سطر المصدر الحر حين يكون الحقل فارغًا.
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

type ZbMsc = { code?: string | null; scheme?: string | null; text?: string | null };
type ZbLink = { type?: string | null; identifier?: string | null; url?: string | null };
type ZbAuthor = { name?: string | null };
type ZbBook = { year?: string | number | null; isbn?: string[] | string | null; publisher?: string | null };
type ZbSeries = { title?: string | null; year?: string | number | null; publisher?: string | null };
type ZbContribution = { text?: string | null; contribution_type?: string | null };

type ZbDoc = {
	id?: number | string | null;
	identifier?: string | null;
	document_type?: { code?: string | null; description?: string | null } | null;
	title?: { title?: string | null; subtitle?: string | null; original?: string | null } | null;
	contributors?: { authors?: ZbAuthor[] | null; editors?: ZbAuthor[] | null } | null;
	source?: { book?: ZbBook[] | null; series?: ZbSeries[] | null; pages?: string | null; source?: string | null } | null;
	msc?: ZbMsc[] | null;
	links?: ZbLink[] | null;
	language?: { languages?: string[] | null } | null;
	editorial_contributions?: ZbContribution[] | null;
	keywords?: string[] | null;
	year?: string | number | null;
	zbmath_url?: string | null;
};

type ZbResponse = {
	result?: ZbDoc[] | ZbDoc | null;
	status?: { nr_total_results?: number; nr_request_results?: number } | null;
};

const clean = (v?: string | null): string | undefined => {
	const t = (v ?? "").trim();
	return t.length > 0 ? t : undefined;
};

function asYear(v?: string | number | null): number | undefined {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	const m = String(v ?? "").match(/(19|20)\d{2}/);
	return m ? Number(m[0]) : undefined;
}

function firstBook(d: ZbDoc): ZbBook | undefined {
	const list = d.source?.book;
	return Array.isArray(list) ? list[0] : undefined;
}

function firstSeries(d: ZbDoc): ZbSeries | undefined {
	const list = d.source?.series;
	return Array.isArray(list) ? list[0] : undefined;
}

function pickAuthors(d: ZbDoc): string[] {
	const authors = d.contributors?.authors ?? [];
	const editors = d.contributors?.editors ?? [];
	const list = authors.length > 0 ? authors : editors;
	const out: string[] = [];
	for (const a of list) {
		const name = clean(a?.name);
		if (name) out.push(name);
	}
	return out;
}

function pickMsc(d: ZbDoc): string[] {
	const out: string[] = [];
	for (const m of d.msc ?? []) {
		const code = clean(m?.code);
		if (code) out.push(code);
	}
	return out;
}

function pickIsbn(d: ZbDoc): string | undefined {
	const raw = firstBook(d)?.isbn;
	const first = Array.isArray(raw) ? raw[0] : raw;
	const digits = (first ?? "").replace(/[-\s]/g, "");
	return digits.length >= 10 ? digits : undefined;
}

function pickDoi(d: ZbDoc): string | undefined {
	for (const l of d.links ?? []) {
		if ((l?.type ?? "").toLowerCase() === "doi") {
			const v = clean(l.identifier) ?? clean(l.url);
			if (v) return v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
		}
	}
	return undefined;
}

/** مراجعة الخبير تقوم مقام الملخص — وهي أفضل من ملخص الناشر عادةً */
function pickAbstract(d: ZbDoc): string | undefined {
	const list = d.editorial_contributions ?? [];
	const review = list.find((c) => (c?.contribution_type ?? "").toLowerCase() === "review") ?? list[0];
	const text = clean(review?.text);
	return text ? text.slice(0, MAX_ABSTRACT) : undefined;
}

/**
 * الناشر: الحقل المخصص أولًا، وهو غالبًا null، فنقرأ سطر المصدر الحر.
 * مثال: "... San Francisco: W. H. Freeman and Company. X, 338 p. (1979)."
 */
function pickPublisher(d: ZbDoc): string | undefined {
	const direct = clean(firstBook(d)?.publisher) ?? clean(firstSeries(d)?.publisher);
	if (direct) return direct;

	const line = clean(d.source?.source);
	if (!line) return undefined;

	for (const [pattern, name] of KNOWN_PUBLISHERS) {
		if (pattern.test(line)) return name;
	}

	// نمط "مدينة: ناشر." — نقف عند نقطة يتبعها رقم صفحات أو ترقيم روماني
	const m = line.match(/:\s*(.{3,70}?)\.\s+(?=[IVXLCivxlc\d])/);
	return m ? m[1].trim() : undefined;
}

/** السلسلة تفيد detectLevel لاستنتاج المستوى (Graduate Texts، Lecture Notes…) */
function pickSeries(d: ZbDoc): string | undefined {
	const direct = clean(firstSeries(d)?.title);
	if (direct) return direct;

	const line = clean(d.source?.source);
	if (!line) return undefined;

	// سطر المصدر يبدأ عادةً باسم السلسلة ثم نقطة ثم "مدينة: ناشر"
	const head = line.split(". ")[0]?.trim();
	if (!head || head.includes(":") || head.length < 8 || head.length > 90) return undefined;
	return head;
}

function pickLanguage(d: ZbDoc): string | undefined {
	const list = d.language?.languages;
	const first = Array.isArray(list) ? clean(list[0]) : undefined;
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
 * dt:b يعني "book / book article" — فالرمز يشمل مقالات داخل كتب أيضًا.
 * وجود أرقام صفحات يعني أن السجل جزء من كتاب لا كتابًا — فنسميه فصلًا
 * وترفضه البوابة القائمة بلا تعديل فيها.
 */
function resolveType(d: ZbDoc): string {
	return clean(d.source?.pages) ? "book-chapter" : "book";
}

function toRawItem(d: ZbDoc): RawItem {
	const mscCodes = pickMsc(d);
	const titleObj = d.title;

	return {
		source: "zbmath",
		sourceId: clean(d.identifier) ?? (d.id != null ? String(d.id) : undefined),
		type: resolveType(d),
		title: clean(titleObj?.title) ?? clean(titleObj?.original),
		subtitle: clean(titleObj?.subtitle),
		authors: pickAuthors(d),
		year: asYear(firstBook(d)?.year) ?? asYear(d.year) ?? asYear(firstSeries(d)?.year),
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
			const firstId = docs[0]?.id != null ? String(docs[0].id) : undefined;
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
