// محوّل Internet Archive — أكبر مخزون متاح من كتب الرياضيات الممسوحة.
//
// الفرق عن Gutenberg جوهري: هنا ملفات PDF للصفحة المطبوعة نفسها برموزها
// الرياضية سليمة، لا نصّ مُعاد صفّه تتلف فيه المعادلات.
//
// الرخصة تُثبَت قبل القبول، لا تُفترض: رابط رخصة صريح، أو سنة نشر قبل 1929.
// وتُستبعد مجموعات الإعارة لأن ملفاتها مغلقة أصلًا ونسخها مخالفة.

import { classifyFields } from "./classify";
import { clean, isMathematics, sleep, type NormalizedBook } from "./normalize";

const SEARCH = "https://archive.org/advancedsearch.php";
const METADATA = "https://archive.org/metadata/";
const DOWNLOAD = "https://archive.org/download/";
const THUMBNAIL = "https://archive.org/services/img/";
const UA = "docmathdz-library-importer/1.0 (+https://www.docmathdz.dev)";

const PAGE_SIZE = 50;
const MAX_PAGES = 40;
const DELAY_MS = 350;

// الملكية العامة في الولايات المتحدة — ما نُشر قبل هذه السنة
const PUBLIC_DOMAIN_BEFORE = 1929;

// مجموعات الإعارة الرقمية — ملفاتها محجوبة
const RESTRICTED_COLLECTIONS = ["inlibrary", "printdisabled", "lendinglibrary", "internetarchivebooks"];

// أفضلية الصيغ: الصورة المطبوعة أولاً
const FORMAT_PRIORITY: Array<{ match: string; mime: string }> = [
	{ match: "text pdf", mime: "application/pdf" },
	{ match: "image container pdf", mime: "application/pdf" },
	{ match: "additional text pdf", mime: "application/pdf" },
	{ match: "pdf", mime: "application/pdf" },
	{ match: "epub", mime: "application/epub+zip" },
	{ match: "djvutxt", mime: "text/plain" },
];

// موضوعات البحث — أوسع من كلمة "mathematics" وحدها لأن الفهرسة هنا غير موحّدة
const SUBJECT_QUERY = [
	"mathematics", "mathematical", "algebra", "geometry", "arithmetic", "calculus",
	"trigonometry", "number theory", "topology", "probabilities", "statistics",
	"differential equations", "mathematical analysis",
]
	.map((s) => 'subject:"' + s + '"')
	.join(" OR ");

type SearchDoc = {
	identifier?: string;
	title?: string | string[];
	creator?: string | string[];
	subject?: string | string[];
	description?: string | string[];
	year?: string | number;
	language?: string | string[];
	licenseurl?: string | string[];
	collection?: string | string[];
};

type MetadataFile = { name?: string; format?: string; size?: string };

function first(value: unknown): string {
	if (Array.isArray(value)) return value.length ? String(value[0]) : "";
	return value === undefined || value === null ? "" : String(value);
}

function list(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v));
	return value === undefined || value === null || value === "" ? [] : [String(value)];
}

function stripHtml(input: string): string {
	return (input || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ");
}

async function getJson(url: string): Promise<unknown> {
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
			if (response.status === 503 || response.status === 429) {
				await sleep(1500 * (attempt + 1));
				continue;
			}
			if (!response.ok) return null;
			return await response.json();
		} catch {
			await sleep(1000 * (attempt + 1));
		}
	}
	return null;
}

/** رخصة مُثبَتة فقط — وإلا فالسلسلة فارغة ويُرفض العنصر */
function licenseOf(doc: SearchDoc): string {
	const url = first(doc.licenseurl).toLowerCase();
	if (url.includes("publicdomain") || url.includes("mark/1.0")) return "public domain";
	const creative = url.match(/creativecommons\.org\/licenses\/([a-z-]+)\//);
	if (creative) return "cc-" + creative[1];
	const year = Number(first(doc.year));
	if (year && year < PUBLIC_DOMAIN_BEFORE) return "public domain";
	return "";
}

function isRestricted(doc: SearchDoc): boolean {
	const collections = list(doc.collection).map((c) => c.toLowerCase());
	return collections.some((c) => RESTRICTED_COLLECTIONS.includes(c));
}

/** اختيار أفضل ملف قابل للتنزيل من قائمة ملفات العنصر */
function pickFile(files: MetadataFile[]): { name: string; mime: string } | null {
	for (const wanted of FORMAT_PRIORITY) {
		for (const file of files) {
			const format = (file.format || "").toLowerCase();
			const name = file.name || "";
			if (!name || name.endsWith(".zip") || name.endsWith(".gz")) continue;
			if (format === wanted.match) return { name, mime: wanted.mime };
		}
	}
	return null;
}

function searchUrl(page: number): string {
	const query = 'mediatype:texts AND (' + SUBJECT_QUERY + ')';
	const fields = [
		"identifier", "title", "creator", "subject", "description", "year",
		"language", "licenseurl", "collection",
	];
	const params = new URLSearchParams();
	params.set("q", query);
	for (const field of fields) params.append("fl[]", field);
	params.append("sort[]", "downloads desc");
	params.set("rows", String(PAGE_SIZE));
	params.set("page", String(page));
	params.set("output", "json");
	return SEARCH + "?" + params.toString();
}

/**
 * يجلب كتب رياضيات حرّة التوزيع من Internet Archive، مرتّبة بعدد التنزيلات.
 * يستمر في التصفح حتى يجمع limit كتابًا جازت البوابة الموضوعية وتحقّقت رخصتها.
 */
export async function fetchArchiveMath(limit: number): Promise<NormalizedBook[]> {
	const books: NormalizedBook[] = [];
	const seen = new Set<string>();

	for (let page = 1; page <= MAX_PAGES && books.length < limit; page++) {
		const payload = (await getJson(searchUrl(page))) as
			| { response?: { docs?: SearchDoc[]; numFound?: number } }
			| null;
		const docs = payload?.response?.docs || [];
		if (!docs.length) break;

		for (const doc of docs) {
			if (books.length >= limit) break;

			const identifier = first(doc.identifier);
			if (!identifier || seen.has(identifier)) continue;
			seen.add(identifier);

			if (isRestricted(doc)) continue;

			const license = licenseOf(doc);
			if (!license) continue;

			const title = first(doc.title);
			const subjects = list(doc.subject);
			if (!title) continue;
			if (!isMathematics([...subjects, title])) continue;

			// البحث لا يعيد قائمة الملفات — نداء واحد لكل عنصر لا مفرّ منه
			await sleep(DELAY_MS);
			const meta = (await getJson(METADATA + encodeURIComponent(identifier))) as
				| { files?: MetadataFile[] }
				| null;
			const picked = pickFile(meta?.files || []);
			if (!picked) continue;

			const summary = clean(stripHtml(first(doc.description)) || subjects.slice(0, 3).join(" · "), 600);
			const verdict = classifyFields({ title, subjects, summary });
			const year = Number(first(doc.year));

			books.push({
				source: "archive",
				sourceId: identifier,
				title: clean(title, 200),
				author: clean(first(doc.creator), 120) || "Unknown",
				summary,
				coverUrl: THUMBNAIL + encodeURIComponent(identifier),
				downloadUrl: DOWNLOAD + encodeURIComponent(identifier) + "/" + encodeURI(picked.name),
				fileMime: picked.mime,
				category: verdict.category,
				license,
				language: first(doc.language) || "",
				year: Number.isFinite(year) && year ? year : null,
			});
		}

		await sleep(DELAY_MS);
	}

	return books;
}
