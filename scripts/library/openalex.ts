// محوّل OpenAlex — كتب مفتوحة الوصول. البيانات الوصفية CC0، بلا مفتاح.
// المسار المهذّب (polite pool) يتطلّب معامل mailto — نمرّره دائمًا.

import { clean, detectCategory, sleep, type NormalizedBook } from "./normalize";

// معرّف مفهوم "Mathematics" في OpenAlex — قابل للتغيير عبر متغير البيئة
const MATH_CONCEPT_ID = process.env.OPENALEX_MATH_CONCEPT || "C33923547";

type OpenAlexLocation = {
	pdf_url: string | null;
	landing_page_url: string | null;
	license: string | null;
};

type OpenAlexWork = {
	id: string;
	doi: string | null;
	display_name: string | null;
	publication_year: number | null;
	language: string | null;
	authorships?: Array<{ author?: { display_name?: string } }>;
	best_oa_location?: OpenAlexLocation | null;
	topics?: Array<{ display_name?: string }>;
};

type OpenAlexPage = { meta?: { next_cursor?: string | null }; results?: OpenAlexWork[] };

const SELECT = "id,doi,display_name,publication_year,language,authorships,best_oa_location,topics";

function authorOf(work: OpenAlexWork): string {
	const first = work.authorships && work.authorships[0];
	const name = first && first.author && first.author.display_name;
	return name || "Unknown";
}

function downloadOf(work: OpenAlexWork): string {
	const location = work.best_oa_location;
	if (location && location.pdf_url) return location.pdf_url;
	if (location && location.landing_page_url) return location.landing_page_url;
	if (work.doi) return work.doi.startsWith("http") ? work.doi : "https://doi.org/" + work.doi;
	return "";
}

/** يجلب كتب الرياضيات مفتوحة الوصول من OpenAlex */
export async function fetchOpenAlexMathBooks(limit: number, mailto: string): Promise<NormalizedBook[]> {
	const books: NormalizedBook[] = [];
	const filter = "type:book,open_access.is_oa:true,concepts.id:" + MATH_CONCEPT_ID;
	let cursor: string | null = "*";

	while (cursor && books.length < limit) {
		const url =
			"https://api.openalex.org/works?filter=" +
			encodeURIComponent(filter) +
			"&select=" +
			encodeURIComponent(SELECT) +
			"&per-page=100&cursor=" +
			encodeURIComponent(cursor) +
			"&mailto=" +
			encodeURIComponent(mailto);

		const response: Response = await fetch(url, { headers: { "User-Agent": "docmathdz-library-importer/1.0 (" + mailto + ")" } });
		if (!response.ok) {
			throw new Error("OpenAlex " + response.status + " " + response.statusText);
		}
		const page = (await response.json()) as OpenAlexPage;

		for (const work of page.results || []) {
			if (books.length >= limit) break;

			const title = work.display_name || "";
			const downloadUrl = downloadOf(work);
			if (!title || !downloadUrl) continue;

			const topics = (work.topics || []).map((t) => t.display_name || "");
			const license = (work.best_oa_location && work.best_oa_location.license) || "";

			books.push({
				source: "openalex",
				sourceId: (work.id || "").replace("https://openalex.org/", ""),
				title: clean(title, 200),
				author: clean(authorOf(work), 120),
				summary: clean(topics.join(" · "), 600),
				coverUrl: "",
				downloadUrl,
				fileMime: downloadUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/html",
				category: detectCategory([...topics, title]),
				license,
				language: work.language || "en",
				year: work.publication_year,
			});
		}

		cursor = (page.meta && page.meta.next_cursor) || null;
		if (cursor) await sleep(300);
	}

	return books;
}
