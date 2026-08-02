// جلب مقال علمي انطلاقًا من DOI:
//   1) بيانات المقال من Crossref (مجاني، بلا مفتاح)
//   2) محاولة مجانية قانونية عبر Unpaywall / arXiv
//   3) وإلا: بروكسي SNDL بمتصفح مسجَّل الدخول
import { doiProxyUrl, proxify } from "./proxy";
import { getSndlBrowser, newSndlPage } from "./session";

export type ArticleMeta = {
	doi: string;
	title: string;
	journal: string | null;
	publisher: string | null;
	year: number | null;
	authors: string[];
};

export type PdfResult = {
	bytes: Uint8Array;
	source: "unpaywall" | "arxiv" | "sndl";
	landingUrl: string | null;
};

const MAILTO =
	process.env.UNPAYWALL_EMAIL || "contact@docmathdz.dev";

function looksLikePdf(bytes: Uint8Array): boolean {
	return (
		bytes.length > 1024 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46
	);
}

/** بيانات المقال من Crossref. */
export async function fetchMeta(doi: string): Promise<ArticleMeta | null> {
	try {
		const r = await fetch(
			"https://api.crossref.org/works/" +
				encodeURIComponent(doi) +
				"?mailto=" +
				encodeURIComponent(MAILTO),
			{ headers: { accept: "application/json" } },
		);
		if (!r.ok) return null;
		const j = (await r.json()) as {
			message?: {
				title?: string[];
				"container-title"?: string[];
				publisher?: string;
				issued?: { "date-parts"?: number[][] };
				author?: Array<{ given?: string; family?: string }>;
			};
		};
		const m = j.message;
		if (!m) return null;
		const year = m.issued?.["date-parts"]?.[0]?.[0] ?? null;
		return {
			doi,
			title: m.title?.[0] ?? "(بلا عنوان)",
			journal: m["container-title"]?.[0] ?? null,
			publisher: m.publisher ?? null,
			year: typeof year === "number" ? year : null,
			authors: (m.author ?? [])
				.map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
				.filter((s) => s.length > 0)
				.slice(0, 6),
		};
	} catch {
		return null;
	}
}

/** رابط PDF مفتوح الوصول إن وُجد. */
async function unpaywallPdfUrl(doi: string): Promise<string | null> {
	try {
		const r = await fetch(
			"https://api.unpaywall.org/v2/" +
				encodeURIComponent(doi) +
				"?email=" +
				encodeURIComponent(MAILTO),
			{ headers: { accept: "application/json" } },
		);
		if (!r.ok) return null;
		const j = (await r.json()) as {
			best_oa_location?: { url_for_pdf?: string | null };
			oa_locations?: Array<{ url_for_pdf?: string | null }>;
		};
		const best = j.best_oa_location?.url_for_pdf;
		if (best) return best;
		for (const loc of j.oa_locations ?? []) {
			if (loc.url_for_pdf) return loc.url_for_pdf;
		}
		return null;
	} catch {
		return null;
	}
}

async function plainDownload(url: string): Promise<Uint8Array | null> {
	try {
		const r = await fetch(url, { redirect: "follow" });
		if (!r.ok) return null;
		const bytes = new Uint8Array(await r.arrayBuffer());
		return looksLikePdf(bytes) ? bytes : null;
	} catch {
		return null;
	}
}

/** استنتاج رابط الـ PDF من صفحة الناشر (داخل البروكسي). */
function guessPdfUrls(landingUrl: string, doi: string): string[] {
	const out: string[] = [];
	let u: URL;
	try {
		u = new URL(landingUrl);
	} catch {
		return out;
	}
	const host = u.hostname;
	const origin = u.origin;

	// Elsevier / ScienceDirect
	const pii = u.pathname.match(/\/pii\/([A-Z0-9]+)/i);
	if (pii) {
		out.push(origin + "/science/article/pii/" + pii[1] + "/pdfft?download=true");
		out.push(origin + "/science/article/pii/" + pii[1] + "/pdf");
	}

	// Springer / Nature
	if (host.includes("springer")) {
		out.push(origin + "/content/pdf/" + doi + ".pdf");
	}
	if (host.includes("nature")) {
		out.push(landingUrl.replace(/\/?$/, "") + ".pdf");
	}

	// Wiley
	if (host.includes("onlinelibrary") || host.includes("wiley")) {
		out.push(origin + "/doi/pdfdirect/" + doi + "?download=true");
		out.push(origin + "/doi/pdf/" + doi);
	}

	// Taylor & Francis
	if (host.includes("tandfonline")) {
		out.push(origin + "/doi/pdf/" + doi + "?download=true");
	}

	return out;
}

type Grab = { ct: string; data: string } | null;

/** جلب المقال عبر SNDL. */
export async function fetchViaSndl(doi: string): Promise<PdfResult | null> {
	const browser = await getSndlBrowser();
	const page = await newSndlPage(browser);
	try {
		await page.goto(doiProxyUrl(doi), {
			waitUntil: "domcontentloaded",
			timeout: 90_000,
		});
		// بعض الناشرين يحوّلون مرتين
		await new Promise((r) => setTimeout(r, 2500));
		const landingUrl = page.url();

		// أفضل مصدر: وسم citation_pdf_url الذي يضعه أغلب الناشرين
		const metaPdf = await page.evaluate(() => {
			const el = document.querySelector('meta[name="citation_pdf_url"]');
			return el ? el.getAttribute("content") : null;
		});

		const candidates: string[] = [];
		if (metaPdf) candidates.push(proxify(metaPdf));
		candidates.push(...guessPdfUrls(landingUrl, doi));

		for (const url of candidates) {
			const grabbed: Grab = await page.evaluate(async (target: string) => {
				try {
					const res = await fetch(target, {
						credentials: "include",
						redirect: "follow",
					});
					if (!res.ok) return null;
					const buf = new Uint8Array(await res.arrayBuffer());
					if (buf.length < 1024) return null;
					let bin = "";
					const step = 0x8000;
					for (let i = 0; i < buf.length; i += step) {
						bin += String.fromCharCode.apply(
							null,
							Array.from(buf.subarray(i, i + step)),
						);
					}
					return {
						ct: res.headers.get("content-type") || "",
						data: btoa(bin),
					};
				} catch {
					return null;
				}
			}, url);

			if (!grabbed) continue;
			const bytes = Uint8Array.from(atob(grabbed.data), (c) =>
				c.charCodeAt(0),
			);
			if (looksLikePdf(bytes)) {
				return { bytes, source: "sndl", landingUrl };
			}
		}

		return null;
	} finally {
		await page.close().catch(() => undefined);
	}
}

/** المسار الكامل: مجاني أولًا ثم SNDL. */
export async function getArticlePdf(doi: string): Promise<PdfResult | null> {
	const oa = await unpaywallPdfUrl(doi);
	if (oa) {
		const bytes = await plainDownload(oa);
		if (bytes) return { bytes, source: "unpaywall", landingUrl: oa };
	}
	return fetchViaSndl(doi);
}
