// تصنيف تخصصات الرياضيات حسب الشعبة الرسمية (الإطار الوطني للمؤهلات والشهادات CNC)
// شعبة الرياضيات: https://cnc.mesrs.dz/ar/fiche-filiere?filiere=رياضيات
// شعبة الرياضيات التطبيقية: https://cnc.mesrs.dz/ar/fiche-filiere?filiere=رياضيات تطبيقية

export type FiliereKey = "math" | "mathapp" | "other";

export const FILIERE_LABELS: Record<FiliereKey, string> = {
	math: "شعبة الرياضيات",
	mathapp: "شعبة الرياضيات التطبيقية",
	other: "تخصصات أخرى",
};

const MATH_ALIASES = [
	"شعبة الرياضيات",
	"رياضيات",
	"mathématiques",
	"mathematiques",
	"رياضيات أساسية",
	"mathématiques fondamentales",
	"تحليل دالي",
	"analyse fonctionnelle",
	"معادلات تفاضلية جزئية",
	"معادلات بمشتقات جزئية",
	"dérivées partielles",
	"derivees partielles",
	"edp",
	"جبر",
	"algèbre",
	"algebre",
	"هندسة",
	"géométrie",
	"geometrie",
	"أنظمة ديناميكية",
	"systèmes dynamiques",
	"systemes dynamiques",
	"تحليل رياضي",
	"analyse mathématique",
	"analyse mathematique",
	"تعليمية الرياضيات",
	"didactique",
];

const MATHAPP_ALIASES = [
	"شعبة الرياضيات التطبيقية",
	"رياضيات تطبيقية",
	"mathématiques appliquées",
	"mathematiques appliquees",
	"احتمالات",
	"probabilités",
	"probabilites",
	"إحصاء",
	"احصاء",
	"statistique",
	"بحوث العمليات",
	"recherche opérationnelle",
	"recherche operationnelle",
	"رياضيات مالية",
	"financières",
	"financieres",
	"نمذجة",
	"modélisation",
	"modelisation",
	"تحليل عددي",
	"analyse numérique",
	"analyse numerique",
	"تحليل عددي ومعادلات تفاضلية جزئية",
	"analyse numérique et edp",
	"تشفير",
	"cryptographie",
	"أمثلة",
	"optimisation",
];

function norm(s: string): string {
	return s.toLowerCase().trim();
}

/**
 * يحدد الشعبة التي ينتمي إليها اسم التخصص — بأطول تطابق (حتى لا تُصنّف
 * "رياضيات تطبيقية" ضمن "رياضيات").
 */
export function filiereOfSpecialty(name: string): FiliereKey {
	const n = norm(name);
	let best: FiliereKey = "other";
	let bestLen = 0;
	for (const a of MATH_ALIASES) {
		if (a.length > bestLen && n.includes(a)) {
			best = "math";
			bestLen = a.length;
		}
	}
	for (const a of MATHAPP_ALIASES) {
		if (a.length > bestLen && n.includes(a)) {
			best = "mathapp";
			bestLen = a.length;
		}
	}
	return best;
}
