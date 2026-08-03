import type { Degree, Purity } from "./repos";

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normAr(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A");
}

export function norm(s: unknown): string {
  return normAr(stripAccents(String(s ?? "").toLowerCase()))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Sports trap: in Arabic "رياضي" also means sport ---
const SPORT = /(تربيه بدنيه|التربيه البدنيه|بدنيه|التدريب الرياضي|تسيير الرياضي|الاعلام والاتصال الرياضي|النشاط البدني|كره القدم|educative? physique|sportif|sportive|eps\b)/;

const MATH_STRONG = [
  "mathematique", "mathematics", "mathematical", "رياضيات", "الرياضيات",
  "analyse fonctionnelle", "functional analysis", "تحليل دالي",
  "equations aux derivees partielles", "partial differential", "معادلات تفاضليه",
  "equation differentielle", "differential equation", "topologie", "topology", "طوبولوجيا",
  "algebre", "algebra", "جبر", "probabilite", "probability", "احتمالات",
  "statistique", "statistics", "احصاء", "analyse numerique", "numerical analysis",
  "optimisation", "optimization", "امثليه", "theorie des graphes", "graph theory",
  "geometrie differentielle", "differential geometry", "هندسه تفاضليه",
  "theorie de la mesure", "measure theory", "espace de banach", "banach", "hilbert",
  "sobolev", "operateur", "operator theory", "semi groupe", "martingale",
  "point fixe", "fixed point", "نقطه صامده", "fractionnaire", "fractional", "كسريه",
  "stochastique", "stochastic", "عشوائي", "viscosite", "homologie", "cohomologie",
];

export function isSports(text: string): boolean {
  return SPORT.test(text);
}

export function mathScore(text: string): number {
  let n = 0;
  for (const t of MATH_STRONG) if (text.includes(t)) n++;
  return n;
}

// --- 12 branches (MSC-lite) ---
export const BRANCHES: Array<{ key: string; ar: string; terms: string[] }> = [
  { key: "algebra", ar: "الجبر", terms: ["algebre", "algebra", "جبر", "anneau", "ring", "groupe", "group theory", "module", "galois", "representation"] },
  { key: "analysis", ar: "التحليل الحقيقي والدالي", terms: ["analyse fonctionnelle", "functional analysis", "تحليل دالي", "banach", "hilbert", "sobolev", "mesure", "measure theory", "operateur", "operator", "point fixe", "fixed point", "harmonique"] },
  { key: "complex", ar: "التحليل المركّب", terms: ["analyse complexe", "complex analysis", "holomorphe", "meromorphe", "تحليل مركب"] },
  { key: "pde", ar: "المعادلات التفاضلية", terms: ["derivees partielles", "partial differential", "equation differentielle", "differential equation", "معادلات تفاضليه", "parabolique", "hyperbolique", "elliptique", "evolution", "fractionnaire", "fractional", "retarde", "delay"] },
  { key: "probability", ar: "الاحتمالات", terms: ["probabilite", "probability", "احتمالات", "stochastique", "stochastic", "martingale", "processus", "markov", "brownien"] },
  { key: "statistics", ar: "الإحصاء", terms: ["statistique", "statistics", "احصاء", "estimation", "regression", "echantillon", "bayesien", "series chronologiques", "time series"] },
  { key: "numerical", ar: "التحليل العددي", terms: ["analyse numerique", "numerical", "elements finis", "finite element", "differences finies", "schema numerique", "تحليل عددي", "simulation"] },
  { key: "geometry", ar: "الطوبولوجيا والهندسة", terms: ["topologie", "topology", "geometrie", "geometry", "variete", "manifold", "riemann", "homologie", "cohomologie", "هندسه", "طوبولوجيا"] },
  { key: "optimization", ar: "الأمثلة والتحكّم", terms: ["optimisation", "optimization", "controle optimal", "optimal control", "programmation lineaire", "linear programming", "امثليه", "تحكم", "jeux", "game theory"] },
  { key: "discrete", ar: "الرياضيات المتقطّعة", terms: ["graphe", "graph theory", "combinatoire", "combinatorics", "cryptographie", "cryptography", "code correcteur", "تشفير", "بيانات"] },
  { key: "logic", ar: "المنطق ونظرية الأعداد", terms: ["logique", "logic", "theorie des nombres", "number theory", "arithmetique", "diophantienne", "نظريه الاعداد", "منطق"] },
  { key: "applied", ar: "رياضيات تطبيقية", terms: ["modelisation", "modeling", "epidemi", "biomathematique", "mecanique des fluides", "fluid", "finance", "actuariel", "نمذجه"] },
];

export function detectBranch(text: string): { key: string; ar: string } {
  let best = { key: "other", ar: "غير مصنّف" };
  let bestScore = 0;
  for (const b of BRANCHES) {
    let s = 0;
    for (const t of b.terms) if (text.includes(t)) s++;
    if (s > bestScore) {
      bestScore = s;
      best = { key: b.key, ar: b.ar };
    }
  }
  return best;
}

export const DEGREE_AR: Record<Degree, string> = {
  doctorat: "دكتوراه",
  magister: "ماجستير",
  master: "ماستر",
  licence: "ليسانس",
  ingenieur: "مهندس",
  autre: "أخرى",
};

export function detectDegree(parts: string[], fallback?: Degree): Degree {
  const t = norm(parts.join(" "));
  if (/(doctorat|doctorate|these de doctorat|phd|ph d|دكتوراه)/.test(t)) return "doctorat";
  if (/(magister|magistere|ماجستير)/.test(t)) return "magister";
  if (/(master|ماستر|mastere|masteriale)/.test(t)) return "master";
  if (/(licence|ليسانس|bachelor)/.test(t)) return "licence";
  if (/(ingenieur|ingeniorat|مهندس)/.test(t)) return "ingenieur";
  return fallback ?? "autre";
}

export function detectLang(raw: string): "ar" | "fr" | "en" {
  const arabic = (raw.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabic > 20 || arabic / Math.max(raw.length, 1) > 0.15) return "ar";
  const t = norm(raw);
  if (/\b(le|la|les|des|une|dans|sur|pour|etude|these|memoire|resume|nous|cette)\b/.test(t)) return "fr";
  return "en";
}

export function yearOf(dates: string[]): number | null {
  const now = new Date().getFullYear() + 1;
  let best: number | null = null;
  for (const d of dates) {
    const m = String(d).match(/(19|20)\d{2}/g);
    if (!m) continue;
    for (const y of m) {
      const n = Number(y);
      if (n >= 1962 && n <= now && (best === null || n > best)) best = n;
    }
  }
  return best;
}

export function classify(
  text: string,
  purity: Purity
): { status: "ok" | "review" | "rejected"; reason?: string } {
  const score = mathScore(text);
  if (isSports(text) && score === 0) return { status: "rejected", reason: "sport" };
  if (purity === "pure") return { status: "ok" };
  if (score >= 1) return { status: "ok" };
  return { status: "review", reason: "mixed-set-no-math-keyword" };
}

export function buildSearchText(...parts: Array<string | string[] | null | undefined>): string {
  const flat: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (Array.isArray(p)) flat.push(...p);
    else flat.push(p);
  }
  return norm(flat.join(" ")).slice(0, 6000);
}
