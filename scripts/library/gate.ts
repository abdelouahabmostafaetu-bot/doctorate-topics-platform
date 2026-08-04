// بوابة القبول — أهم ملف في المحرك.
// لا يُنشر سجل واحد دون أن يمر من هنا: كتب فقط، 2004 وما بعد، ومصنّف إلزاميًا.

import { classify, detectBookKind, detectLevel, type Classification } from "./classify";
import type { BookKind, Level, RawItem } from "./types";

/** طلب المستخدم: كتب جديدة فقط — بعد 2003 */
export const MIN_YEAR = 2004;

/** أنواع السجلات المقبولة — كتب لا أوراق ولا مقالات */
export const BOOK_TYPES = new Set([
	"book",
	"books",
	"monograph",
	"book-chapter",
	"book-part",
	"book-set",
	"edited-book",
	"reference-book",
	"textbook",
	"OUV", // ouvrage — HAL
	"COUV", // chapitre d'ouvrage — HAL
	"DOUV", // direction d'ouvrage — HAL
]);

/**
 * مصادر محجوبة نهائيًا — قرصنة صريحة.
 * فهرستها تسهيل للانتهاك، وأغلفتها أعمال فنية محمية، ونطاقاتها تتغير بعد كل حجب.
 */
export const BLOCKED_SOURCES = [
	"annas-archive",
	"anna's archive",
	"libgen",
	"library genesis",
	"z-library",
	"zlibrary",
	"sci-hub",
	"scihub",
	"bookfi",
	"b-ok",
];

export type Verdict =
	| {
			ok: true;
			classification: Classification;
			level?: Level;
			bookKind?: BookKind;
	  }
	| { ok: false; action: "reject"; reason: string }
	| { ok: false; action: "quarantine"; reason: string };

const reject = (reason: string): Verdict => ({ ok: false, action: "reject", reason });
const quarantine = (reason: string): Verdict => ({ ok: false, action: "quarantine", reason });

function isBlocked(raw: RawItem): boolean {
	const hay = `${raw.source} ${raw.landingUrl ?? ""} ${raw.pdfUrl ?? ""}`.toLowerCase();
	return BLOCKED_SOURCES.some((b) => hay.includes(b));
}

/**
 * البوابة. الترتيب مقصود: الأرخص فحصًا أولًا، والتصنيف أخيرًا لأنه الأغلى.
 */
export function accept(raw: RawItem): Verdict {
	// 1) كتب فقط
	if (!raw.type || !BOOK_TYPES.has(raw.type.trim())) {
		return reject(`ليس كتابًا (type=${raw.type ?? "غير محدد"})`);
	}

	// 2) السنة — بعد 2003
	if (!raw.year || !Number.isFinite(raw.year)) return reject("سنة مفقودة");
	if (raw.year < MIN_YEAR) return reject(`أقدم من ${MIN_YEAR} (${raw.year})`);
	if (raw.year > new Date().getFullYear() + 1) return reject(`سنة غير معقولة (${raw.year})`);

	// 3) عنوان حقيقي
	const title = (raw.title ?? "").trim();
	if (title.length < 4) return reject("عنوان ناقص");
	if (/^(untitled|sans titre|front matter|back matter|index|contents)$/i.test(title)) {
		return reject("عنوان تقني لا كتاب");
	}

	// 4) مصدر مشروع — لا استثناءات
	if (isBlocked(raw)) return reject("مصدر محجوب");

	// 5) رابط صفحة رسمية إلزامي (حتى نستطيع دائمًا الإحالة للمصدر)
	if (!raw.landingUrl && !raw.doi && !raw.pdfUrl) return reject("لا رابط ولا معرّف");

	// 6) تصنيف إلزامي — بلا تصنيف لا نشر
	const classification = classify(raw);
	if (!classification) return quarantine("تعذر التصنيف بثقة");

	return {
		ok: true,
		classification,
		level: detectLevel(raw),
		bookKind: detectBookKind(raw),
	};
}
