// تحويل RawItem إلى LibraryItem — الممر الوحيد للدخول إلى المكتبة.

import { resolveAccess, verifyPdf } from "./access";
import { resolveCover } from "./cover";
import { accept, MIN_QUALITY_SCORE } from "./gate";
import { canonicalKey, normalizeDoi, normalizeIsbn, slugify, titleNorm } from "./normalize";
import { publisherTier, qualityScore } from "./quality";
import type { LibraryItem, RawItem } from "./types";

export type NormalizeResult =
	| { ok: true; item: LibraryItem }
	| { ok: false; action: "reject" | "quarantine"; reason: string; raw: RawItem };

export type NormalizeOptions = {
	/** التحقق من روابط PDF بـ HEAD (أبطأ لكن أصدق) */
	verifyPdfLinks?: boolean;
	/** حل الأغلفة بـ HEAD (أبطأ لكن يمنع المربعات البيضاء) */
	resolveCovers?: boolean;
};

/** رابط DOI قياسي */
function doiUrl(doi?: string): string | undefined {
	return doi ? "https://doi.org/" + doi : undefined;
}

export async function normalizeItem(
	raw: RawItem,
	opts: NormalizeOptions = {},
): Promise<NormalizeResult> {
	const verdict = accept(raw);
	if (!verdict.ok) {
		return { ok: false, action: verdict.action, reason: verdict.reason, raw };
	}

	const title = (raw.title ?? "").trim();
	const year = raw.year as number;
	const authors = (raw.authors ?? []).map((a) => a.trim()).filter(Boolean);
	const isbn13 = normalizeIsbn(raw.isbn13);
	const doi = normalizeDoi(raw.doi);

	let access = resolveAccess(raw);
	let pdfUrl = access === "metadata-only" ? undefined : raw.pdfUrl;
	let pdfStatus: LibraryItem["pdfStatus"];
	let pdfCheckedAt: Date | undefined;

	if (pdfUrl && opts.verifyPdfLinks) {
		const check = await verifyPdf(pdfUrl);
		pdfStatus = check.pdfStatus;
		pdfCheckedAt = check.pdfCheckedAt;
		// رابط ميت = لا نعد بتحميل → ينزل السجل إلى بيانات ورابط رسمي
		if (check.pdfStatus === "dead") {
			pdfUrl = undefined;
			access = "metadata-only";
		}
	}

	// حساب الدرجة قبل بناء السجل: لا معنى لجلب غلاف لسجل سيُرفض
	const score = qualityScore({
		publisher: raw.publisher,
		year,
		access,
		doi,
		abstract: raw.abstract,
	});

	// حد الجودة: مكتبة محترمة ترفض الهياكل الفارغة.
	// إلى الحجر لا السلة: قد يكمل مصدر أخر بياناته لاحقًا فيرتفع.
	if (score < MIN_QUALITY_SCORE) {
		return {
			ok: false,
			action: "quarantine",
			reason: `جودة دون الحد (${score}/${MIN_QUALITY_SCORE})`,
			raw,
		};
	}

	const cover = opts.resolveCovers
		? await resolveCover({ sourceCoverUrl: raw.coverUrl, isbn13 })
		: raw.coverUrl
			? ({ coverUrl: raw.coverUrl, coverKind: "publisher" } as const)
			: ({ coverKind: "generated" } as const);

	const landingUrl = raw.landingUrl ?? doiUrl(doi) ?? (pdfUrl as string);

	const key = canonicalKey({ doi, isbn13, title, year, authors });

	const item: LibraryItem = {
		canonicalKey: key,
		slug: slugify(title, 60) + "-" + String(year),

		title,
		subtitle: raw.subtitle?.trim() || undefined,
		titleNorm: titleNorm(title),
		authors,
		year,
		publisher: raw.publisher?.trim() || undefined,
		series: raw.series?.trim() || undefined,
		edition: raw.edition?.trim() || undefined,
		isbn13,
		doi,
		language: raw.language?.slice(0, 2).toLowerCase() || "en",
		abstract: raw.abstract?.trim().slice(0, 1500) || undefined,
		pageCount: raw.pageCount,

		category: verdict.classification.category,
		subtopics: verdict.classification.subtopics,
		mscCodes: raw.mscCodes ?? [],
		level: verdict.level,
		bookKind: verdict.bookKind,
		classifiedBy: verdict.classification.classifiedBy,
		confidence: verdict.classification.confidence,

		access,
		landingUrl,
		pdfUrl,
		pdfStatus,
		pdfCheckedAt,
		license: raw.license?.trim() || undefined,

		coverUrl: cover.coverUrl,
		coverKind: cover.coverKind,

		qualityScore: score,
		publisherTier: publisherTier(raw.publisher),
		sources: [raw.source],
		harvestedAt: new Date(),
		updatedAt: new Date(),
	};

	return { ok: true, item };
}
