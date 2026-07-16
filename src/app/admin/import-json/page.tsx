import { JsonImportForm, CopyBlock } from "@/components/admin/json-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* برومبت جاهز ينسخه الأدمين إلى أي ذكاء اصطناعي مع صور/PDF الامتحان */
const AI_PROMPT = [
  "Convertis l'examen dans les images/PDF ci-joints en UN SEUL fichier JSON,",
  "exactement au format ci-dessous. Donne-moi le JSON complet dans un bloc de code",
  "(ou un fichier .json telechargeable). N'invente rien: transcris fidelement.",
  "",
  "{",
  '  "exams": [',
  "    {",
  '      "university": "Batna 2",',
  '      "universityAr": "جامعة باتنة 2",',
  '      "specialty": "Math\u00e9matiques",',
  '      "specialtyAr": "رياضيات",',
  '      "year": 2023,',
  '      "examType": "specialty",',
  '      "examNumber": 1,',
  '      "durationMinutes": 90,',
  '      "title": "مسابقة الدكتوراه 2023 — جامعة باتنة 2 (تحليل)",',
  '      "sourceNote": "PDF officiel",',
  '      "problems": [',
  "        {",
  '          "problemNumber": 1,',
  '          "title": "Exercice 1",',
  '          "difficulty": "medium",',
  '          "tags": ["analyse"],',
  '          "statement": "Soit $f \\\\in C^1([a,b])$ ...\\n$$\\n\\\\int_a^b f(x)\\\\,dx = F(b) - F(a)\\n$$\\n...",',
  '          "solution": null,',
  '          "remark": null',
  "        }",
  "      ]",
  "    }",
  "  ]",
  "}",
  "",
  "REGLES STRICTES pour les mathematiques (LaTeX):",
  "- Math en ligne: $x^2 + y^2$ (dollars simples).",
  "- Math affichee (display): $$ sur sa PROPRE ligne, puis le code LaTeX,",
  "  puis $$ sur sa propre ligne. Dans la chaine JSON cela s'ecrit:",
  '  "...texte...\\n$$\\n\\\\int_0^1 f(x)\\\\,dx\\n$$\\n...texte..."',
  "- INTERDIT: $`code`$ (syntaxe GitLab), \\\\[...\\\\], \\\\(...\\\\), blocs ```math.",
  "- Dans JSON, chaque backslash LaTeX s'ecrit double: \\\\frac, \\\\int, \\\\mathbb.",
  "- Chaque exercice = un objet dans problems, numerote dans l'ordre.",
  "- Texte en francais comme dans l'original; l'arabe est permis dans remark.",
  "- examType: 'general' (مسابقة عامة) ou 'specialty' (مسابقة تخصص).",
  "- Si la meme universite a plusieurs sujets la meme annee: examNumber 1, 2, 3...",
  "- solution: null si la correction n'est pas fournie.",
].join("\n");

const JSON_SHAPE = [
  "الملف المقبول: كائن اختبار واحد، أو مصفوفة اختبارات [...]، أو { \"exams\": [...] }",
  "",
  "الحقول المطلوبة: university ، specialty ، year ، examType ، problems (تمرين واحد على الأقل بحقل statement)",
  "الحقول الاختيارية: universityAr ، specialtyAr ، examNumber ، coefficient ، durationMinutes ، title ، sourceNote ، status",
  "",
  "• الجامعة/التخصص غير الموجودين يُنشأان تلقائيًا",
  "• status افتراضيًا = published (نشر مباشر) — ضع \"draft\" إن أردت المراجعة أولًا",
  "• التكرار مرفوض تلقائيًا (نفس الجامعة/السنة/النوع/الرقم) — الموجود لا يُمس",
  "• يُصلّح تلقائيًا: $`كود`$ ← $كود$ ، وكتل ```math و $$ بسطر واحد ← كتلة $$ متعددة الأسطر",
  "• يُرفض: \\[ ... \\] و \\( ... \\)",
].join("\n");

export default function ImportJsonPage() {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-base font-bold">📦 استيراد اختبارات من ملفات JSON</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          اطلب من أي ذكاء اصطناعي (ChatGPT ، Gemini ، Le Chat ...) تحويل صور أو PDF
          الامتحان إلى ملف JSON بالبرومبت أدناه، ثم ارفع الملف (أو عدة ملفات) هنا —
          تُضاف الاختبارات وتُنشر مباشرة دون إعادة كتابة أي شيء.
        </p>
      </div>

      <JsonImportForm />

      <div className="grid gap-3 lg:grid-cols-2">
        <CopyBlock label="🤖 برومبت جاهز للذكاء الاصطناعي (انسخه مع صور الامتحان)" text={AI_PROMPT} />
        <div className="rounded-xl border">
          <div className="border-b bg-secondary/40 px-3 py-2 text-xs font-bold">
            📐 الصيغة المقبولة والقواعد
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed">
            {JSON_SHAPE}
          </pre>
        </div>
      </div>
    </div>
  );
}
