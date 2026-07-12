// قواعد تحسين LaTeX + معالجة موضوع كامل عبر الذكاء الاصطناعي — تستخدمها الواجهة مباشرة
import { askLLM } from "./llm";

const STYLE_RULES = `Tu es un expert LaTeX pour des sujets de concours de doctorat en math\u00e9matiques.
Reformate le texte suivant selon ces r\u00e8gles STRICTES :
1. Ne change JAMAIS le contenu math\u00e9matique ni le texte fran\u00e7ais. Uniquement la mise en forme LaTeX.
2. CONSERVE le format des formules : $\`...\`$ pour les formules en ligne, et les blocs \`\`\`math ... \`\`\` pour les formules centr\u00e9es. N'utilise JAMAIS $$...$$ ni \\[...\\].
3. Parenth\u00e8ses dimensionn\u00e9es : \\bigl( ... \\bigr) autour des expressions compos\u00e9es.
4. Espace fine avant les diff\u00e9rentielles : \\,dx et \\,dt.
5. \\displaystyle\\int pour les int\u00e9grales importantes en ligne.
6. \\quad avant \\forall ; notations standard : \\mathcal{D}(I), C^\\infty, H^1(I), L^2(I).
7. Les syst\u00e8mes et probl\u00e8mes variationnels avec \\begin{cases} ... \\end{cases} et \\\\[6pt] entre les lignes longues.
8. Utilise UNIQUEMENT des commandes support\u00e9es par KaTeX.
9. Conserve la num\u00e9rotation a) b) c), les retours \u00e0 la ligne et la structure Markdown existante (gras, N.B., etc.).
10. R\u00e9ponds UNIQUEMENT avec le texte reformat\u00e9, sans aucune explication, sans bloc de code autour.

Texte \u00e0 reformater :

`;

export type PolishedProblemDraft = {
  problemNumber: number;
  statement: string | null;
  solution: string | null;
  remark: string | null;
};

export type ProblemInput = {
  problemNumber: number;
  statement: string;
  solution?: string | null;
  remark?: string | null;
};

/** يزيل سياج markdown إن غلّف النموذج الناتج به بالخطأ */
function cleanup(s: string): string {
  let t = String(s).trim();
  if (t.startsWith("```") && t.endsWith("```") && !t.startsWith("```math")) {
    t = t.replace(/^```[a-z]*\r?\n/, "").replace(/\r?\n```$/, "").trim();
  }
  return t;
}

/** فحص سلامة: الناتج يجب ألا يفقد أكثر من ثلث الطول ولا يستخدم $$ */
function looksSafe(src: string, out: string): boolean {
  if (!out || out.length < src.length * 0.6) return false;
  if (out.includes("$$")) return false;
  return true;
}

const FIELDS = ["statement", "solution", "remark"] as const;

/**
 * يحسّن كل حقول تمارين موضوع واحد ويرجع مسودة للمراجعة — لا يلمس قاعدة البيانات.
 */
export async function polishProblems(problems: ProblemInput[]): Promise<{
  problems: PolishedProblemDraft[];
  anyChange: boolean;
}> {
  const out: PolishedProblemDraft[] = [];
  let anyChange = false;
  for (const p of problems) {
    const entry: PolishedProblemDraft = {
      problemNumber: p.problemNumber,
      statement: null,
      solution: null,
      remark: null,
    };
    for (const field of FIELDS) {
      const src = p[field];
      if (!src || !String(src).trim()) continue;
      const srcText = String(src);
      const res = cleanup(await askLLM(STYLE_RULES + srcText));
      if (!looksSafe(srcText, res)) continue;
      entry[field] = res;
      if (res !== srcText) anyChange = true;
    }
    out.push(entry);
  }
  return { problems: out, anyChange };
}
