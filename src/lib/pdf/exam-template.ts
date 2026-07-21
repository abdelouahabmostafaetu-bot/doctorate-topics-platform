// قالب PDF احترافي بأسلوب مسابقات الدكتوراه الرسمية (بالفرنسية، بدون حلول)
// الغلاف الأمامي والخلفي: صور من public/images (pdf-cover.png / pdf-back.png)
import { renderMathHtml, escapeHtml } from "./render-content";

export type PdfTopic = {
	title: string;
	year: number;
	examType: string;
	examNumber: number | null;
	coefficient: number | null;
	durationMinutes: number | null;
	university: { name: string };
	specialty: { name: string };
	problems: Array<{
		problemNumber: number;
		title: string;
		statement: string;
		remark?: string | null;
	}>;
};

// النطاق المطلق للموقع — لتحميل صور الغلاف داخل متصفح الطباعة
const SITE_ORIGIN =
	(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
	"https://www.docmathdz.dev";

const COVER_IMAGE = SITE_ORIGIN + "/images/pdf-cover.png";
const BACK_IMAGE = SITE_ORIGIN + "/images/pdf-back.png";

// اختصار الأسماء الطويلة (تجنّب الكلمات غير المفيدة)
export function shortName(name: string, max = 46): string {
	let s = name
		.replace(/École Nationale Supérieure/gi, "ENS")
		.replace(/École Normale Supérieure/gi, "ENS")
		.replace(/Sciences et de la Technologie/gi, "S & T")
		.replace(/Université des /gi, "Univ. ")
		.replace(/Université de /gi, "Univ. ")
		.replace(/Université d['’]/gi, "Univ. ")
		.replace(/Université /gi, "Univ. ")
		.replace(/\s+/g, " ")
		.trim();
	if (s.length > max) s = s.slice(0, max - 1).trimEnd() + "…";
	return s;
}

function clamp(s: string, max: number): string {
	const t = (s ?? "").trim();
	return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

function durationLabel(min: number | null): string {
	if (!min) return "2h";
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m ? h + "h" + String(m).padStart(2, "0") + "mn" : h + "h";
}

function examTypeLabel(t: string): string {
	return t === "general" ? "Épreuve commune" : "Épreuve de spécialité";
}

function topicSection(
	t: PdfTopic,
	idx: number,
	total: number,
	numbered: boolean,
): string {
	// ملاحظة: لا نعرض remark (N.B.) في ملف PDF — المطلوب التمارين فقط
	const exercises = t.problems
		.map((p) => {
			return (
				'<div class="exercise">' +
				'<div class="ex-head"><span class="ex-name">Exercice ' +
				p.problemNumber +
				" :</span>" +
				"</div>" +
				'<div class="ex-body">' +
				renderMathHtml(p.statement) +
				"</div>" +
				"</div>"
			);
		})
		.join("\n");

	const sujetNum =
		t.examNumber != null
			? " — Sujet n° " + String(t.examNumber).padStart(2, "0")
			: "";
	const coef =
		t.coefficient != null ? " — Coefficient : " + t.coefficient : "";

	// ترويسة مصغّرة وأنيقة — نفس أسلوب مسابقات الدكتوراه الرسمية
	return (
		'<section class="topic">' +
		'<div class="bk-head">' +
		'<div class="bk-univ">' +
		escapeHtml(t.university.name) +
		"</div>" +
		'<div class="bk-fac">Faculté des Mathématiques</div>' +
		'<div class="bk-dept">Faculté des Sciences Département de Mathématiques.</div>' +
		"<div class=\"bk-title\">Concours d'entrée en doctorat : " +
		escapeHtml(t.specialty.name) +
		"</div>" +
		'<div class="bk-date">(' +
		t.year +
		")</div>" +
		'<div class="bk-ep">' +
		examTypeLabel(t.examType) +
		sujetNum +
		coef +
		" ; Durée : " +
		durationLabel(t.durationMinutes) +
		"</div>" +
		'<div class="bk-sep"></div>' +
		"</div>" +
		(numbered
			? '<div class="doc-num">Sujet ' + idx + " / " + total + "</div>"
			: "") +
		exercises +
		"</section>"
	);
}

// صفحة صورة بكامل المساحة (الغلاف الأمامي)
function frontCover(): string {
	return (
		'<section class="imgpage">' +
		'<img class="page-img" src="' +
		COVER_IMAGE +
		'" alt="Doc Math DZ — Recueil de Sujets" />' +
		"</section>"
	);
}

// الصفحة الأخيرة (رسالة المنصة)
function backCover(): string {
	return (
		'<section class="imgpage back">' +
		'<img class="page-img" src="' +
		BACK_IMAGE +
		'" alt="Doc Math DZ — docmathdz.dev" />' +
		"</section>"
	);
}

// صفحة الشكر + فهرس هرمي أنيق: السنة ← التخصص ← الجامعة
function thanksAndToc(topics: PdfTopic[]): string {
	const years = new Map<
		number,
		Map<string, Map<string, Array<{ t: PdfTopic; idx: number }>>>
	>();
	topics.forEach((t, i) => {
		const y = years.get(t.year) ?? new Map();
		years.set(t.year, y);
		const specKey = clamp(t.specialty.name, 60);
		const s = y.get(specKey) ?? new Map();
		y.set(specKey, s);
		const uniKey = shortName(t.university.name);
		const arr = s.get(uniKey) ?? [];
		s.set(uniKey, arr);
		arr.push({ t, idx: i + 1 });
	});

	let toc = "";
	for (const [year, specs] of [...years.entries()].sort((a, b) => b[0] - a[0])) {
		for (const [spec, unis] of [...specs.entries()].sort((a, b) =>
			a[0].localeCompare(b[0]),
		)) {
			// سطر واحد أنيق يجمع التخصّص والسنة معًا (بدل سطرين منفصلين)
			toc +=
				'<div class="toc-group"><span class="toc-group-spec">' +
				escapeHtml(spec) +
				'</span><span class="toc-group-sep"></span><span class="toc-group-year">' +
				year +
				"</span></div>";
			for (const [uni, items] of [...unis.entries()].sort((a, b) =>
				a[0].localeCompare(b[0]),
			)) {
				toc += '<div class="toc-uni">' + escapeHtml(uni) + "</div>";
				for (const it of items) {
					toc +=
						'<div class="toc-item"><span class="toc-title">' +
						escapeHtml(clamp(it.t.title, 64)) +
						'</span><span class="toc-dots"></span><span class="toc-idx">Sujet ' +
						it.idx +
						"</span></div>";
				}
			}
		}
	}

	return (
		'<section class="thanks" dir="rtl">' +
		'<div class="th-frame">' +
		'<div class="th-basmala">بِسْمِ اللهِ الرَّحْمَٰنِ الرَّحِيمِ</div>' +
		'<div class="th-orn"></div>' +
		'<div class="th-title">شكر وتقدير</div>' +
		'<div class="th-orn"></div>' +
		'<div class="th-body">' +
		'<p>الحمد لله الذي بنعمته تتمّ الصالحات، والصلاة والسلام على خير البريّات</p>' +
		'<p>نتقدّم بجزيل الشكر وعظيم الامتنان إلى كل من ساهم في إعداد هذا العمل</p>' +
		'<p>إلى أساتذتنا الأفاضل الذين أناروا لنا دروب العلم والمعرفة</p>' +
		'<p>وإلى كل طلبة الدكتوراه في الرياضيات عبر ربوع الجزائر الحبيبة</p>' +
		'<p>نضع بين أيديكم هذه المجموعة من المواضيع عونًا لكم في مشواركم العلمي</p>' +
		'<p>سائلين المولى عز وجل أن يكلّل مسيرتكم بالتوفيق والسداد والنجاح</p>' +
		'</div>' +
		'<div class="th-quote">﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾</div>' +
		'</div>' +
		"</section>" +
		'<section class="toc">' +
		'<div class="toc-orn"></div>' +
		"<h2>Table des matières</h2>" +
		'<div class="toc-orn"></div>' +
		'<div class="toc-note">Classement : année, puis spécialité, puis université — ' +
		topics.length +
		" sujet" +
		(topics.length > 1 ? "s" : "") +
		", version sans corrigés</div>" +
		toc +
		"</section>"
	);
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: "KaTeX_Main", "STIX Two Text", "Noto Naskh Arabic", Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.45; color: #000; margin: 0; }
section.topic, section.imgpage, section.thanks, section.toc { page-break-after: always; }
section.topic:last-of-type { page-break-after: auto; }
section.imgpage.back { page-break-before: always; page-break-after: auto; }
.page-img { display: block; width: 100%; height: 258mm; object-fit: contain; }
.bk-head { text-align: center; margin: 0 0 4mm; }
.bk-univ { font-variant: small-caps; font-size: 11pt; font-weight: 700; color: #163a70; letter-spacing: .04em; }
.bk-fac { font-size: 8.5pt; font-weight: 700; margin-top: 1px; }
.bk-dept { font-size: 7.5pt; color: #333; margin-top: 1px; }
.bk-title { font-size: 9.5pt; font-weight: 700; margin-top: 3px; }
.bk-date { font-size: 8pt; font-style: italic; margin-top: 1px; }
.bk-ep { font-size: 8pt; font-style: italic; }
.bk-sep { width: 100%; border-top: 1.2px solid #163a70; border-bottom: 0.6px solid #d4af37; height: 1.1mm; margin: 2.5mm 0 0; }
.doc-num { text-align: right; font-size: 8.5pt; color: #555; margin-bottom: 5px; }
.exercise { margin-bottom: 20px; }
.ex-head { margin-bottom: 4px; }
.ex-name { font-weight: 700; font-size: 11pt; color: #163a70; }
.ex-title { font-weight: 700; font-size: 11pt; margin-left: 6px; }
.ex-body { width: 100%; }
.ex-body p { margin: 6px 0; text-align: justify; text-indent: 0; }
.ex-body ol, .ex-body ul { margin: 7px 0 7px 22px; padding: 0; }
.ex-body li { margin: 6px 0; text-align: justify; }
.math-block { margin: 10px 0; text-align: center; }
.katex-display { margin: 10px 0; }
.katex { font-size: 1.04em; }
.ex-remark { font-size: 9.8pt; font-style: italic; margin-top: 8px; }
.end-line { text-align: center; font-style: italic; margin-top: 26px; color: #555; font-size: 10pt; }
.ex-body table { border-collapse: collapse; margin: 9px auto; }
.ex-body table td, .ex-body table th { border: 1px solid #555; padding: 4px 10px; font-size: 10pt; }
.thanks { min-height: 250mm; display: flex; align-items: center; justify-content: center; text-align: center; }
.th-frame { border: 1.5px solid #d4af37; outline: 4px double #163a70; outline-offset: 5px; padding: 18mm 14mm; max-width: 158mm; }
.th-basmala { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 17pt; font-weight: 700; color: #163a70; margin-bottom: 8mm; }
.th-title { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 28pt; font-weight: 700; color: #163a70; margin: 5mm 0; letter-spacing: .01em; }
.th-orn { width: 62mm; height: 2px; margin: 0 auto; background: linear-gradient(90deg, transparent, #d4af37 30%, #d4af37 70%, transparent); }
.th-body { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 14.5pt; line-height: 2.25; color: #1c1c1c; margin-top: 8mm; }
.th-body p { margin: 0 0 2.5mm; }
.th-quote { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 17pt; font-weight: 700; color: #a3781a; margin-top: 9mm; }
.toc-orn { width: 92mm; height: 2px; margin: 0 auto; background: linear-gradient(90deg, transparent, #d4af37 22%, #d4af37 78%, transparent); }
.toc h2 { text-align: center; font-size: 20pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #163a70; margin: 4mm 0; }
.toc-note { text-align: center; font-size: 8.5pt; font-style: italic; color: #666; margin: 2mm 0 6mm; }
.toc-group { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; font-size: 11.5pt; font-weight: 700; font-variant: small-caps; letter-spacing: .03em; color: #163a70; margin: 6.5mm 0 2.5mm; padding-bottom: 1.4mm; border-bottom: 1.2px solid #d4af37; }
.toc-group-spec { }
.toc-group-sep { flex: 1; }
.toc-group-year { font-size: 9.5pt; font-weight: 600; font-variant: normal; letter-spacing: 0; color: #a3781a; white-space: nowrap; }
.toc-uni { font-size: 9.5pt; font-style: italic; color: #555; margin: 2mm 0 1mm 4mm; }
.toc-item { display: flex; align-items: baseline; gap: 6px; margin: 1.3mm 0 1.3mm 12mm; font-size: 9.5pt; color: #222; }
.toc-title { max-width: 72%; }
.toc-dots { flex: 1; border-bottom: 1px dotted #b08d2f; min-width: 8px; }
.toc-idx { white-space: nowrap; font-weight: 600; color: #163a70; }
`;

/**
 * يبني مستند HTML كاملاً جاهزًا للتحويل إلى PDF.
 * - موضوع واحد: ترويسة رسمية مصغّرة + التمارين (بدون حلول).
 * - عدة مواضيع: غلاف مصوّر + صفحة شكر + فهرس أنيق، وكل موضوع يبدأ في صفحة جديدة،
 *   ثم صفحة ختامية مصوّرة في النهاية.
 */
export function buildExamHtml(
	topics: PdfTopic[],
	opts: { toc?: boolean } = {},
): string {
	const numbered = topics.length > 1;
	const body = topics
		.map((t, i) => topicSection(t, i + 1, topics.length, numbered))
		.join("\n");
	const front =
		opts.toc && numbered ? frontCover() + thanksAndToc(topics) : "";
	const back = opts.toc && numbered ? backCover() : "";
	return (
		'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
		'<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">' +
		'<link rel="preconnect" href="https://fonts.googleapis.com">' +
		'<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Noto+Naskh+Arabic:wght@400;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">' +
		"<style>" +
		CSS +
		"</style></head><body>" +
		front +
		body +
		back +
		"</body></html>"
	);
}
