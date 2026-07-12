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
	if (!min) return "3 h 00";
	const h = Math.floor(min / 60);
	const m = min % 60;
	return m ? h + " h " + String(m).padStart(2, "0") : h + " h 00";
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
	const exercises = t.problems
		.map((p) => {
			const title = p.title
				? '<span class="ex-title">' + escapeHtml(clamp(p.title, 90)) + "</span>"
				: "";
			const remark = p.remark
				? '<div class="ex-remark"><strong>N.B.</strong> ' +
					renderMathHtml(p.remark) +
					"</div>"
				: "";
			return (
				'<div class="exercise">' +
				'<div class="ex-head"><span class="ex-name">Exercice ' +
				p.problemNumber +
				"</span>" +
				title +
				"</div>" +
				'<div class="ex-body">' +
				renderMathHtml(p.statement) +
				"</div>" +
				remark +
				"</div>"
			);
		})
		.join("\n");

	const sujetNum =
		t.examNumber != null
			? " — Sujet n° " + String(t.examNumber).padStart(2, "0")
			: "";
	const coef =
		t.coefficient != null
			? "<strong>Coefficient :</strong> " + t.coefficient + " — "
			: "";

	return (
		'<section class="topic">' +
		'<div class="letterhead">' +
		'<div class="lh-top">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>' +
		"<div class=\"lh-min\">Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>" +
		'<div class="lh-univ">' +
		escapeHtml(t.university.name) +
		"</div>" +
		"</div>" +
		'<div class="head-rule"></div>' +
		'<div class="exam-title">' +
		"<div class=\"et-main\">Concours d'accès à la Formation Doctorale</div>" +
		'<div class="et-session">Session ' +
		t.year +
		"</div>" +
		"</div>" +
		'<table class="meta"><tr>' +
		"<td><strong>Spécialité :</strong> " +
		escapeHtml(t.specialty.name) +
		"</td>" +
		'<td class="ta-r"><strong>' +
		examTypeLabel(t.examType) +
		"</strong>" +
		sujetNum +
		"</td>" +
		"</tr><tr>" +
		"<td><strong>Durée :</strong> " +
		durationLabel(t.durationMinutes) +
		"</td>" +
		'<td class="ta-r">' +
		coef +
		"Documents non autorisés</td>" +
		"</tr></table>" +
		(numbered
			? '<div class="doc-num">Sujet ' + idx + " / " + total + "</div>"
			: "") +
		exercises +
		'<div class="end-line">— Fin du sujet —</div>' +
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
		'<div class="cv-top">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</div>' +
		"<div class=\"cv-min\">Ministère de l'Enseignement Supérieur et de la Recherche Scientifique</div>" +
		'<div class="cv-frame">' +
		'<div class="cv-title">Recueil de Sujets</div>' +
		"<div class=\"cv-sub\">Concours d'accès à la Formation Doctorale</div>" +
		'<div class="cv-count">' +
		topics.length +
		" sujet" +
		(topics.length > 1 ? "s" : "") +
		" — version sans corrigés</div>" +
		'<div class="cv-rules">Classement : année, puis spécialité, puis université<br>Chaque sujet commence sur une nouvelle page — énoncés sans corrigés</div>' +
		"</div>" +
		'<div class="cv-date">Généré le ' +
		date +
		" — Doctorate Topics Platform</div>" +
		"</section>" +
		'<section class="toc"><h2>Table des matières</h2>' +
		toc +
		"</section>"
	);
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: "STIX Two Text", Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.6; color: #111; margin: 0; }
section.topic, section.cover, section.toc { page-break-after: always; }
section.topic:last-of-type { page-break-after: auto; }
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
.ex-head { padding-bottom: 3px; margin-bottom: 9px; border-bottom: 1px solid #999; }
.ex-name { font-weight: 700; font-size: 12pt; }
.ex-title { font-style: italic; color: #444; font-size: 10pt; margin-left: 12px; }
.ex-body p { margin: 7px 0; text-align: justify; }
.ex-body ol, .ex-body ul { margin: 7px 0 7px 24px; padding: 0; }
.ex-body li { margin: 6px 0; }
.math-block { margin: 10px 0; text-align: center; }
.katex-display { margin: 10px 0; }
.katex { font-size: 1.04em; }
.ex-remark { border-left: 2px solid #999; padding: 4px 10px; font-size: 9.8pt; margin-top: 9px; color: #333; }
.end-line { text-align: center; font-style: italic; margin-top: 26px; color: #555; font-size: 10pt; }
.ex-body table { border-collapse: collapse; margin: 9px auto; }
.ex-body table td, .ex-body table th { border: 1px solid #555; padding: 4px 10px; font-size: 10pt; }
.cover { display: flex; flex-direction: column; min-height: 245mm; text-align: center; }
.cv-top { font-size: 9.5pt; font-variant: small-caps; letter-spacing: .08em; margin-top: 10mm; }
.cv-min { font-size: 8.5pt; color: #444; }
.cv-frame { border: 1.5px solid #111; outline: 1px solid #111; outline-offset: 3px; margin: 40mm 12mm 0; padding: 16mm 10mm; }
.cv-title { font-size: 25pt; font-weight: 700; letter-spacing: .04em; }
.cv-sub { font-size: 13pt; margin-top: 6mm; }
.cv-count { font-size: 11pt; margin-top: 8mm; font-style: italic; color: #333; }
.cv-rules { font-size: 9pt; color: #333; margin-top: 10mm; line-height: 1.8; }
.cv-date { margin-top: auto; font-size: 9pt; color: #555; padding-bottom: 6mm; }
.toc h2 { text-align: center; font-size: 15pt; border-bottom: 1.5px solid #111; padding-bottom: 5px; }
.toc-year { font-size: 12.5pt; font-weight: 700; margin: 14px 0 5px; border-bottom: 1px solid #777; padding-bottom: 2px; }
.toc-spec { font-size: 11pt; font-weight: 600; margin: 9px 0 3px 10px; }
.toc-uni { font-size: 10pt; font-style: italic; margin: 5px 0 2px 22px; color: #333; }
.toc-item { display: flex; align-items: baseline; gap: 6px; margin: 2px 0 2px 34px; font-size: 9.8pt; }
.toc-idx { font-weight: 600; white-space: nowrap; }
.toc-dots { flex: 1; border-bottom: 1px dotted #999; min-width: 10px; }
.toc-title { max-width: 70%; }
`;

/**
 * يبني مستند HTML كاملاً جاهزًا للتحويل إلى PDF.
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
	return (
		'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
		'<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">' +
		'<link rel="preconnect" href="https://fonts.googleapis.com">' +
		'<link href="https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">' +
		"<style>" +
		CSS +
		"</style></head><body>" +
		front +
		body +
		"</body></html>"
	);
}
