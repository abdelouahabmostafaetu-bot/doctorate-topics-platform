// قالب PDF احترافي بأسلوب مسابقات الدكتوراه الرسمية (بالفرنسية، بدون حلول)
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
		"</div>" +
		(numbered
			? '<div class="doc-num">Sujet ' + idx + " / " + total + "</div>"
			: "") +
		exercises +
		"</section>"
	);
}

// الغلاف + فهرس هرمي: السنة ← التخصص ← الجامعة
function coverAndToc(topics: PdfTopic[]): string {
	const date = new Date().toLocaleDateString("fr-FR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

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
		toc += '<div class="toc-year">Année ' + year + "</div>";
		for (const [spec, unis] of [...specs.entries()].sort((a, b) =>
			a[0].localeCompare(b[0]),
		)) {
			toc += '<div class="toc-spec">' + escapeHtml(spec) + "</div>";
			for (const [uni, items] of [...unis.entries()].sort((a, b) =>
				a[0].localeCompare(b[0]),
			)) {
				toc += '<div class="toc-uni">' + escapeHtml(uni) + "</div>";
				for (const it of items) {
					toc +=
						'<div class="toc-item"><span class="toc-idx">Sujet ' +
						it.idx +
						"</span><span class=\"toc-dots\"></span><span class=\"toc-title\">" +
						escapeHtml(clamp(it.t.title, 64)) +
						"</span></div>";
				}
			}
		}
	}

	return (
		'<section class="cover">' +
		'<div class="cv-top">République Algérienne Démocratique et Populaire</div>' +
		"<div class=\"cv-min\">Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>" +
		'<div class="cv-mid">' +
		'<div class="cv-rule"></div>' +
		'<div class="cv-title">Recueil de Sujets</div>' +
		"<div class=\"cv-sub\">Concours d'accès à la Formation Doctorale</div>" +
		'<div class="cv-rule"></div>' +
		'<div class="cv-count">' +
		topics.length +
		" sujet" +
		(topics.length > 1 ? "s" : "") +
		" — version sans corrigés</div>" +
		'<div class="cv-rules">Classement : année, puis spécialité, puis université</div>' +
		"</div>" +
		'<div class="cv-date">Généré le ' +
		date +
		" — docmathdz.dev</div>" +
		"</section>" +
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
		'<section class="toc"><h2>Table des matières</h2>' +
		toc +
		"</section>"
	);
}

function backCover(): string {
	return (
		'<section class="backcover">' +
		'<div class="bc-mid">' +
		'<div class="bc-title">Bonne réussite à tous les candidats</div>' +
		'<div class="bc-quote">« Les mathématiques sont la reine des sciences. »</div>' +
		'<div class="bc-author">— Carl Friedrich Gauss</div>' +
		'</div>' +
		'<div class="bc-foot">' +
		'<div class="bc-rule"></div>' +
		'<div class="bc-site">docmathdz.dev</div>' +
		'<div class="bc-min">Doctorate Topics Platform — Archive des concours d\'accès à la formation doctorale en mathématiques</div>' +
		"</div>" +
		"</section>"
	);
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: "KaTeX_Main", "STIX Two Text", "Noto Naskh Arabic", Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.45; color: #000; margin: 0; }
section.topic, section.cover, section.thanks, section.toc { page-break-after: always; }
section.topic:last-of-type { page-break-after: auto; }
.bk-head { text-align: center; margin: 2mm 0 8mm; }
.bk-univ { font-variant: small-caps; font-size: 15.5pt; font-weight: 700; letter-spacing: .03em; }
.bk-fac { font-size: 11pt; font-weight: 700; margin-top: 2px; }
.bk-dept { font-size: 8.5pt; margin-top: 1px; }
.bk-title { font-size: 12.5pt; font-weight: 700; margin-top: 5px; }
.bk-date { font-size: 9.5pt; font-style: italic; margin-top: 2px; }
.bk-ep { font-size: 9.5pt; font-style: italic; }
.letterhead { text-align: center; }
.lh-top { font-size: 9.5pt; letter-spacing: .08em; font-variant: small-caps; }
.lh-min { font-size: 8.5pt; color: #444; margin-top: 2px; }
.lh-univ { font-size: 10.5pt; font-weight: 600; margin-top: 4px; }
.head-rule { border-top: 1.5px solid #111; height: 0; margin: 9px 0 14px; }
.exam-title { text-align: center; margin: 8px 0 12px; }
.et-main { font-size: 15pt; font-weight: 700; }
.et-session { font-size: 11pt; margin-top: 3px; font-style: italic; }
table.meta { width: 100%; border: none; border-top: 1px solid #111; border-bottom: 1px solid #111; border-collapse: collapse; font-size: 10pt; margin: 10px 0 20px; }
table.meta td { padding: 5px 2px; }
.ta-r { text-align: right; }
.doc-num { text-align: right; font-size: 9pt; color: #555; margin-bottom: 6px; }
.exercise { margin-bottom: 22px; }
.ex-head { margin-bottom: 5px; }
.ex-name { font-weight: 700; font-size: 11.5pt; }
.ex-title { font-weight: 700; font-size: 11pt; margin-left: 6px; }
.ex-body p { margin: 6px 0; text-align: justify; text-indent: 1.3em; }
.ex-body ol, .ex-body ul { margin: 7px 0 7px 24px; padding: 0; }
.ex-body li { margin: 6px 0; }
.math-block { margin: 10px 0; text-align: center; }
.katex-display { margin: 10px 0; }
.katex { font-size: 1.04em; }
.ex-remark { font-size: 9.8pt; font-style: italic; margin-top: 8px; }
.end-line { text-align: center; font-style: italic; margin-top: 26px; color: #555; font-size: 10pt; }
.ex-body table { border-collapse: collapse; margin: 9px auto; }
.ex-body table td, .ex-body table th { border: 1px solid #555; padding: 4px 10px; font-size: 10pt; }
.cover { min-height: 258mm; display: flex; flex-direction: column; align-items: center; text-align: center; color: #111; padding-top: 6mm; }
.cv-top { font-variant: small-caps; font-size: 10.5pt; letter-spacing: .1em; color: #222; }
.cv-min { font-size: 8.5pt; color: #555; margin-top: 1.5mm; }
.cv-mid { margin: auto 0; width: 100%; }
.cv-rule { width: 100%; border-top: 2.2px solid #163a70; border-bottom: 0.8px solid #163a70; height: 1.6mm; margin: 8mm 0; }
.cv-title { font-size: 26pt; font-weight: 700; color: #163a70; letter-spacing: .02em; }
.cv-sub { font-size: 12pt; font-variant: small-caps; letter-spacing: .06em; color: #333; margin-top: 3.5mm; }
.cv-count { font-size: 10pt; font-style: italic; color: #333; margin-top: 9mm; }
.cv-rules { font-size: 8.5pt; color: #666; margin-top: 2mm; }
.cv-date { margin-top: auto; width: 100%; font-size: 8.5pt; color: #666; border-top: 0.6px solid #aaa; padding-top: 2.5mm; }
.backcover { min-height: 258mm; display: flex; flex-direction: column; text-align: center; color: #111; page-break-before: always; }
.bc-mid { margin: auto 0; }
.bc-title { font-size: 13pt; font-variant: small-caps; letter-spacing: .06em; color: #163a70; margin-bottom: 6mm; }
.bc-quote { font-size: 11pt; font-style: italic; color: #333; }
.bc-author { font-size: 9pt; font-variant: small-caps; color: #666; margin-top: 2mm; }
.bc-foot { margin-top: auto; }
.bc-rule { width: 100%; border-top: 2.2px solid #163a70; border-bottom: 0.8px solid #163a70; height: 1.6mm; margin-bottom: 3.5mm; }
.bc-site { font-size: 11pt; font-weight: 700; letter-spacing: .12em; color: #163a70; }
.bc-min { font-size: 8pt; color: #666; margin-top: 1.5mm; }
.thanks { min-height: 250mm; display: flex; align-items: center; justify-content: center; text-align: center; }
.th-frame { border: 1.5px solid #d4af37; outline: 4px double #163a70; outline-offset: 5px; padding: 18mm 14mm; max-width: 158mm; }
.th-basmala { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 17pt; font-weight: 700; color: #163a70; margin-bottom: 8mm; }
.th-title { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 28pt; font-weight: 700; color: #163a70; margin: 5mm 0; letter-spacing: .01em; }
.th-orn { width: 62mm; height: 2px; margin: 0 auto; background: linear-gradient(90deg, transparent, #d4af37 30%, #d4af37 70%, transparent); }
.th-body { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 14.5pt; line-height: 2.25; color: #1c1c1c; margin-top: 8mm; }
.th-body p { margin: 0 0 2.5mm; }
.th-quote { font-family: "Amiri", "Noto Naskh Arabic", serif; font-size: 17pt; font-weight: 700; color: #a3781a; margin-top: 9mm; }
.toc h2 { text-align: center; font-size: 15pt; font-weight: 700; font-variant: small-caps; letter-spacing: .08em; color: #163a70; border-bottom: 3px double #163a70; padding-bottom: 3mm; margin-bottom: 8mm; }
.toc-year { font-size: 11.5pt; font-weight: 700; font-variant: small-caps; letter-spacing: .06em; color: #163a70; margin: 7mm 0 2.5mm; border-bottom: 0.8px solid #163a70; padding-bottom: 1.2mm; }
.toc-spec { font-size: 10.5pt; font-weight: 700; color: #222; margin: 3.5mm 0 1.5mm 4mm; }
.toc-uni { font-size: 9.5pt; font-style: italic; color: #555; margin: 2mm 0 1mm 8mm; }
.toc-item { display: flex; align-items: baseline; gap: 6px; margin: 1.2mm 0 1.2mm 12mm; font-size: 9.5pt; color: #222; }
.toc-idx { font-weight: 400; white-space: nowrap; }
.toc-dots { flex: 1; border-bottom: 1px dotted #777; min-width: 10px; }
.toc-title { max-width: 70%; }
`;

/**
 * يبني مستند HTML كاملاً جاهزًا للتحويل إل�� PDF.
 * - موضوع واحد: ترويسة رسمية + التمارين (بدون حلول).
 * - عدة مواضيع: غلاف + فهرس هرمي، وكل موضوع يبدأ في صفحة جديدة.
 */
export function buildExamHtml(
	topics: PdfTopic[],
	opts: { toc?: boolean } = {},
): string {
	const numbered = topics.length > 1;
	const body = topics
		.map((t, i) => topicSection(t, i + 1, topics.length, numbered))
		.join("\n");
	const front = opts.toc && numbered ? coverAndToc(topics) : "";
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
