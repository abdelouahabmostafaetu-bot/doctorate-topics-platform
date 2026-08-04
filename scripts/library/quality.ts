// جودة الناشر ودرجة الترتيب — هذا ما يميز مكتبة محترمة عن مكبّ ملفات.

import type { Access, RawItem } from "./types";

/** الناشرون المرموقون — كتبهم محكّمة ومراجعة */
export const TIER_A_PUBLISHERS = [
	"springer",
	"springer nature",
	"birkhauser",
	"birkhäuser",
	"cambridge university press",
	"oxford university press",
	"ems press",
	"european mathematical society",
	"american mathematical society",
	"societe mathematique de france",
	"société mathématique de france",
	"de gruyter",
	"mit press",
	"princeton university press",
	"elsevier",
	"wiley",
	"crc press",
	"chapman",
	"world scientific",
	"siam",
	"clay mathematics institute",
];

/** ناشرون جامعيون ومؤسسات تعليمية مفتوحة — جيدون */
export const TIER_B_PUBLISHERS = [
	"university press",
	"presses universitaires",
	"openstax",
	"libretexts",
	"open book publishers",
	"intechopen",
	"edp sciences",
	"hindawi",
	"atlantis press",
];

export function publisherTier(publisher?: string): 1 | 2 | 3 {
	if (!publisher) return 3;
	const p = publisher.toLowerCase();
	if (TIER_A_PUBLISHERS.some((x) => p.includes(x))) return 1;
	if (TIER_B_PUBLISHERS.some((x) => p.includes(x))) return 2;
	return 3;
}

/**
 * درجة من 100 تُستعمل في ترتيب Meilisearch (qualityScore:desc).
 * الأثر العملي: كتب Springer المفتوحة الحديثة تتصدر النتائج دائمًا.
 */
export function qualityScore(input: {
	publisher?: string;
	year: number;
	access: Access;
	doi?: string;
	abstract?: string;
	coverKind?: string;
}): number {
	let score = 0;

	const tier = publisherTier(input.publisher);
	score += tier === 1 ? 40 : tier === 2 ? 20 : 0;

	if (input.year >= 2022) score += 30;
	else if (input.year >= 2018) score += 20;
	else if (input.year >= 2012) score += 12;
	else score += 5;

	score += input.access === "open" ? 20 : input.access === "external" ? 10 : 0;

	if (input.doi) score += 5;
	if (input.abstract && input.abstract.length > 120) score += 5;

	return Math.min(100, score);
}

/** هل الناشر تجاري بحت؟ يفيد في تحديد metadata-only */
export function isCommercialPublisher(raw: RawItem): boolean {
	const p = (raw.publisher ?? "").toLowerCase();
	return ["springer", "elsevier", "wiley", "cambridge", "oxford", "de gruyter", "crc", "world scientific"].some(
		(x) => p.includes(x),
	);
}
