// محوّل Gutendex — فهرس Project Gutenberg (كتب في الملك العام، استضافتها مسموحة تمامًا).
// شكل الاستجابة موثّق رسميًا على https://gutendex.com — بلا مفتاح وبلا تسجيل.

import { classifyFields } from "./classify";
import { clean, isMathematics, sleep, type NormalizedBook } from "./normalize";
import { cleanAuthor, cleanTitle } from "./text";

type GutendexPerson = { name: string; birth_year: number | null; death_year: number | null };

type GutendexBook = {
	id: number;
	title: string;
	subjects: string[];
	bookshelves: string[];
	authors: GutendexPerson[];
	summaries?: string[];
	languages: string[];
	copyright: boolean | null;
	media_type: string;
	formats: Record<string, string>;
	download_count: number;
};

type GutendexPage = { count: number; next: string | null; results: GutendexBook[] };

const USER_AGENT = "docmathdz-library-importer/1.0 (+https://www.docmathdz.dev)";

// ترتيب الأفضلية: PDF ثم EPUB ثم النص — نتجنّب أرشيفات zip لأنها لا تُقرأ مباشرة
const DOWNLOAD_PRIORITY = [
	"application/pdf",
	"application/epub+zip",
	"application/x-mobipocket-ebook",
	"text/plain; charset=utf-8",
	"text/plain",
	"text/html; charset=utf-8",
	"text/html",
];

function pickDownload(formats: Record<string, string>): { url: string; mime: string } | null {
	for (const mime of DOWNLOAD_PRIORITY) {
		const url = formats[mime];
		if (url && !url.endsWith(".zip")) return { url, mime };
	}
	return null;
}

function pickCover(formats: Record<string, string>): string {
	return formats["image/jpeg"] || "";
}

function authorOf(book: GutendexBook): string {
	const first = book.authors && book.authors[0];
	return first && first.name ? first.name : "Unknown";
}

/** يجلب كتب الرياضيات من Project Gutenberg حتى الحد المطلوب */
export async function fetchGutenbergMath(limit: number): Promise<NormalizedBook[]> {
	const books: NormalizedBook[] = [];
	let url: string | null = "https://gutendex.com/books?topic=mathematics&sort=popular";

	while (url && books.length < limit) {
		const response: Response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
		if (!response.ok) {
			throw new Error("Gutendex " + response.status + " " + response.statusText);
		}
		const page = (await response.json()) as GutendexPage;

		for (const book of page.results || []) {
			if (books.length >= limit) break;
			// نستضيف الملك العام فقط — أي كتاب ما زال محميًا يُستبعد
			if (book.copyright === true) continue;

			const subjects = [...(book.subjects || []), ...(book.bookshelves || [])];
			if (!isMathematics([...subjects, book.title])) continue;

			const download = pickDownload(book.formats || {});
			if (!download) continue;

			const summary = (book.summaries && book.summaries[0]) || (book.subjects || []).slice(0, 3).join(" · ");

			// نمرّر الحقول مفصولة: رأس الموضوع دليل أقوى من العنوان، والعنوان أقوى من الملخّص
			const verdict = classifyFields({ title: book.title, subjects, summary });

			books.push({
				source: "gutenberg",
				sourceId: String(book.id),
				title: cleanTitle(book.title),
				author: cleanAuthor(authorOf(book)),
				summary: clean(summary, 600),
				coverUrl: pickCover(book.formats || {}),
				downloadUrl: download.url,
				fileMime: download.mime,
				category: verdict.category,
				license: "Public Domain",
				language: (book.languages && book.languages[0]) || "en",
				year: null,
			});
		}

		url = page.next;
		if (url) await sleep(400); // احترام الخادم
	}

	return books;
}
