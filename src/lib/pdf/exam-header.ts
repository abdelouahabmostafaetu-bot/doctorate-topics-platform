// =============================================================================
//  الترويسة الرسمية لمواضيع «المسابقة الوطنية للدخول إلى الدكتوراه»
// -----------------------------------------------------------------------------
//  المبدأ: قالب واحد + بيانات لا نهائية.
//  كل البيانات تأتي من قاعدة البيانات الموجودة أصلًا في المشروع:
//      University.name / University.nameAr / University.logoUrl / University.slug
//      Specialty.name  / Specialty.nameAr
//  لا توجد قاعدة جامعات ثانية، ولا اسم جامعة مكتوب داخل هذا الملف.
//
//  البنية (مطابقة للمواضيع الرسمية):
//        الجمهورية الجزائرية الديمقراطية الشعبية
//        وزارة التعليم العالي والبحث العلمي
//    [Université + Faculté]      [الشعار]      [الجامعة + الكلية]
//    ─────────────────────────────────────────────────────────────
//    Concours national d'accès au Doctorat au titre de l'année 2025–2026
//    Filière : Mathématiques        Spécialité : ...
//    Épreuve : ...
// =============================================================================
import { escapeHtml } from "./render-content";

// النطاق المطلق للموقع — متصفح الطباعة يحمّل الشعارات عبر HTTP
const SITE_ORIGIN =
	(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
	"https://www.docmathdz.dev";

// الصيغ المسموح بها للشعار — ما عداها يُرفض ويُستعمل البديل المحيّد
const ALLOWED_LOGO_EXT = /\.(?:png|jpe?g|webp|svg)(?:[?#].*)?$/i;

// الشعبة الافتراضية للمنصة
export const DEFAULT_FIELD_FR = "Mathématiques";

// الكلية الافتراضية — مخطط قاعدة البيانات لا يحتوي حقل كلية
const DEFAULT_FACULTY_FR = "Faculté des Mathématiques";
const DEFAULT_FACULTY_AR = "كلية الرياضيات";

/**
 * استثناءات اسم الكلية، والمفتاح هو University.slug.
 * لا تكتب اسم جامعة في القالب — أضف السطر هنا فقط عند اختلاف اسم الكلية فعلًا:
 *   "usthb": { fr: "Faculté de Mathématiques", ar: "كلية الرياضيات" },
 */
const FACULTY_OVERRIDES: Record<string, { fr: string; ar: string }> = {};

export type HeaderUniversity = {
	name: string;
	nameAr?: string | null;
	slug?: string | null;
	logoUrl?: string | null;
};

export type OfficialHeaderInput = {
	university: HeaderUniversity;
	/** Spécialité بالفرنسية */
	specialty: string;
	/** التخصص بالعربية — يُعرض في العمود العربي إن وُجد */
	specialtyAr?: string | null;
	/** سنة المسابقة: 2025 تُعرض «2025–2026» */
	year: number;
	/** Épreuve — مثلاً: Épreuve commune */
	epreuve: string;
	/** Filière — الافتراضي Mathématiques */
	field?: string;
	/** سطر ثانوي: Sujet n° / Coefficient / Durée */
	meta?: string;
};

function resolveFaculty(slug?: string | null): { fr: string; ar: string } {
	const key = (slug ?? "").trim().toLowerCase();
	return (
		FACULTY_OVERRIDES[key] ?? {
			fr: DEFAULT_FACULTY_FR,
			ar: DEFAULT_FACULTY_AR,
		}
	);
}

/** 2025 → «2025–2026» (السنة الجامعية للمسابقة) */
export function competitionYearLabel(year: number): string {
	if (!Number.isFinite(year) || year <= 0) return "";
	return year + "–" + (year + 1);
}

// أحرف أولى تُستعمل في البديل المحيّد عند غياب الشعار
function logoInitials(name: string): string {
	const stop = new Set([
		"universite",
		"de",
		"des",
		"du",
		"d",
		"la",
		"le",
		"les",
		"et",
		"centre",
		"center",
		"ecole",
		"nationale",
		"normale",
		"superieure",
	]);
	const words = (name ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.split(/[\s'’\-–—_.]+/)
		.filter((w) => w.length > 0 && !stop.has(w.toLowerCase()));
	const letters = words
		.slice(0, 3)
		.map((w) => w.charAt(0).toUpperCase())
		.join("");
	return letters || "DZ";
}

/**
 * مسار الشعار النهائي، أو null إن لم يوجد شعار صالح.
 * 1) University.logoUrl إن كانت صيغته مدعومة (مطلق أو نسبي أو data:)
 * 2) الاصطلاح المحلي /logos/universities/<slug>.png
 * 3) null → بديل محيّد (لا يتعطّل الـ PDF أبدًا)
 */
function resolveLogoSrc(u: HeaderUniversity): string | null {
	const raw = (u.logoUrl ?? "").trim();
	if (raw) {
		if (/^data:image\//i.test(raw)) return raw;
		if (ALLOWED_LOGO_EXT.test(raw)) {
			if (/^https?:\/\//i.test(raw)) return raw;
			return SITE_ORIGIN + (raw.startsWith("/") ? raw : "/" + raw);
		}
		// صيغة غير مدعومة (PDF مثلًا) — لا نكسر الملف، نكمل إلى الاصطلاح المحلي
	}
	const slug = (u.slug ?? "").trim();
	if (slug && /^[a-z0-9-]+$/i.test(slug)) {
		return SITE_ORIGIN + "/logos/universities/" + slug + ".png";
	}
	return null;
}

// البديل المحيّد يقع تحت الصورة: إن فشل تحميل الشعار يظهر مكانه دون فراغ مكسور
function logoCell(u: HeaderUniversity): string {
	const src = resolveLogoSrc(u);
	const placeholder =
		'<span class="oh-logo-ph">' + escapeHtml(logoInitials(u.name)) + "</span>";
	if (!src) return '<span class="oh-logo-wrap">' + placeholder + "</span>";
	return (
		'<span class="oh-logo-wrap">' +
		placeholder +
		'<img class="oh-logo-img" src="' +
		escapeHtml(src) +
		'" alt="" onerror="this.style.display=&quot;none&quot;" />' +
		"</span>"
	);
}

/** يبني ترويسة موضوع واحد. تصلح لأي جامعة دون أي تعديل على القالب. */
export function buildOfficialHeader(input: OfficialHeaderInput): string {
	const faculty = resolveFaculty(input.university.slug);
	const nameFr = escapeHtml((input.university.name ?? "").trim());
	const nameAr = escapeHtml((input.university.nameAr ?? "").trim());
	const specialtyAr = escapeHtml((input.specialtyAr ?? "").trim());
	const field = escapeHtml((input.field || DEFAULT_FIELD_FR).trim());
	const specialty = escapeHtml((input.specialty ?? "").trim());
	const epreuve = escapeHtml((input.epreuve ?? "").trim());
	const meta = escapeHtml((input.meta ?? "").trim());
	const yearLabel = competitionYearLabel(input.year);

	// العمود العربي: اسم الجامعة إن وُجد، وإلا الكلية وحدها حتى يبقى التوازن
	const arabicCell = nameAr
		? '<span class="oh-u">' +
			nameAr +
			'</span><span class="oh-f">' +
			escapeHtml(faculty.ar) +
			"</span>" +
			(specialtyAr ? '<span class="oh-s">' + specialtyAr + "</span>" : "")
		: '<span class="oh-u">' + escapeHtml(faculty.ar) + "</span>";

	return (
		'<div class="oh">' +
		'<div class="oh-state" dir="rtl" lang="ar">' +
		'<span class="oh-l1">الجمهورية الجزائرية الديمقراطية الشعبية</span>' +
		'<span class="oh-l2">وزارة التعليم العالي والبحث العلمي</span>' +
		"</div>" +
		'<table class="oh-row"><tbody><tr>' +
		'<td class="oh-fr">' +
		'<span class="oh-u">' +
		nameFr +
		'</span><span class="oh-f">' +
		escapeHtml(faculty.fr) +
		"</span></td>" +
		'<td class="oh-logo">' +
		logoCell(input.university) +
		"</td>" +
		'<td class="oh-ar" dir="rtl" lang="ar">' +
		arabicCell +
		"</td>" +
		"</tr></tbody></table>" +
		'<div class="oh-rule"></div>' +
		'<div class="oh-concours">Concours national d\u2019accès au Doctorat' +
		(yearLabel
			? '<span class="oh-year"> au titre de l\u2019année ' +
				yearLabel +
				"</span>"
			: "") +
		"</div>" +
		'<div class="oh-fil"><span>Filière : ' +
		field +
		"</span>" +
		(specialty ? "<span>Spécialité : " + specialty + "</span>" : "") +
		"</div>" +
		(epreuve ? '<div class="oh-ep">Épreuve : ' + epreuve + "</div>" : "") +
		(meta ? '<div class="oh-meta">' + meta + "</div>" : "") +
		"</div>"
	);
}

/** أنماط الترويسة — تُدمج في CSS الخاص بـ exam-template.ts */
export const OFFICIAL_HEADER_CSS = `
.oh { margin: 0 0 5mm; page-break-inside: avoid; break-inside: avoid; }
.oh-state { text-align: center; direction: rtl; font-family: "Amiri", "Noto Naskh Arabic", serif; }
.oh-state span { display: block; }
.oh-l1 { font-size: 13.5pt; font-weight: 700; line-height: 1.35; }
.oh-l2 { font-size: 12pt; font-weight: 700; line-height: 1.35; }
.oh-row { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 2.4mm; }
.oh-row td { padding: 0; vertical-align: middle; }
.oh-fr, .oh-ar { width: 36%; text-align: center; }
.oh-logo { width: 28%; text-align: center; }
.oh-fr .oh-u { display: block; font-size: 10pt; font-weight: 700; line-height: 1.3; }
.oh-fr .oh-f { display: block; font-size: 9.5pt; line-height: 1.3; }
.oh-ar { direction: rtl; font-family: "Amiri", "Noto Naskh Arabic", serif; }
.oh-ar .oh-u { display: block; font-size: 12pt; font-weight: 700; line-height: 1.45; }
.oh-ar .oh-f { display: block; font-size: 11pt; font-weight: 700; line-height: 1.45; }
.oh-ar .oh-s { display: block; font-size: 10pt; line-height: 1.45; color: #333; }
.oh-logo-wrap { position: relative; display: inline-block; width: 26mm; height: 24mm; vertical-align: middle; }
.oh-logo-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: #fff; }
.oh-logo-ph { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border: 0.8px dashed #b0b0b0; border-radius: 1.5mm; color: #8a8a8a; font-size: 12pt; font-weight: 700; letter-spacing: .06em; }
.oh-rule { width: 100%; border-top: 1.2px solid #163a70; border-bottom: 0.6px solid #d4af37; height: 1.1mm; margin: 3mm 0 2.4mm; }
.oh-concours { text-align: center; font-size: 12pt; font-weight: 700; line-height: 1.35; }
.oh-year { white-space: nowrap; }
.oh-fil { text-align: center; font-size: 10.5pt; font-weight: 700; margin-top: 1.6mm; }
.oh-fil span + span { margin-left: 8mm; }
.oh-ep { text-align: center; font-size: 11.5pt; font-weight: 700; margin-top: 1.6mm; }
.oh-meta { text-align: center; font-size: 9pt; font-style: italic; color: #333; margin-top: 1.2mm; }
`;
