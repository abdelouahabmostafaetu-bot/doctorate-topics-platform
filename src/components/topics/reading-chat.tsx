"use client";

// ✨ مساعد الذكاء الاصطناعي داخل وضع القراءة — v2
// - بث مباشر مع عرض LaTeX فوري (KaTeX أثناء الكتابة)
// - لغة الدردشة: English / العربية / Français
// - إرفاق صور (vision) وملفات PDF (استخراج النص عبر pdf.js)
// - بحث ويب 🌐 (Perplexity Sonar) + وضع تفكير 🧠 (نماذج -pro)
// - تعمل عبر Puter.js (المستخدم يدفع) — لا مفاتيح API ولا تكلفة على الموقع
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ReadingProblem } from "./reading-mode";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    puter?: any;
    pdfjsLib?: any;
  }
}

type Lang = "en" | "ar" | "fr";

type Attachment =
  | { kind: "image"; name: string; dataUrl: string }
  | { kind: "pdf"; name: string; text: string; pages: number };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  problemNumber?: number;
  model?: string;
};

const MODELS = [
  { id: "gpt-5.6-terra", label: "⭐ Terra" },
  { id: "gpt-5.6-sol", label: "🚀 Sol" },
  { id: "gpt-5.6-luna", label: "⚡ Luna" },
  { id: "gpt-5.5", label: "GPT-5.5" },
];

/** وضع التفكير 🧠 — يرقّي النموذج إلى نسخته -pro */
const PRO_MAP: Record<string, string> = {
  "gpt-5.6-terra": "gpt-5.6-terra-pro",
  "gpt-5.6-sol": "gpt-5.6-sol-pro",
  "gpt-5.6-luna": "gpt-5.6-luna-pro",
  "gpt-5.5": "gpt-5.5-pro",
};

const PUTER_SRC = "https://js.puter.com/v2/";
const PDFJS_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_FILE_MB = 5;
const MAX_ATTACHMENTS = 4;

/** نصوص الواجهة بثلاث لغات */
const T: Record<Lang, Record<string, string>> = {
  en: {
    title: "Math Assistant",
    knows: "Answers about Exercise",
    newChat: "New chat",
    close: "Close chat",
    moveSide: "Move chat to the other side",
    placeholder: "Ask about this exercise…",
    stop: "Stop generating",
    send: "Send (Enter)",
    typing: "Typing…",
    deepThinking: "Thinking deeply… this may take up to a minute ⏳",
    searchingWeb: "Searching the web…",
    emptyTitle: "How can I help with this exercise?",
    emptyHint: "I can see the exercise you are viewing — ask directly.",
    signin: "On your first message a free Puter sign-in window may appear (once only).",
    q1: "Explain clearly what this exercise is asking",
    q2: "Give me a hint without revealing the full solution",
    q3: "Solve this exercise step by step in detail",
    q4: "Suggest a similar exercise for practice",
    web: "Web search",
    think: "Thinking",
    attach: "Attach image or PDF",
    copy: "Copy",
    copied: "Copied ✓",
    footer: "Free via Puter · Enter to send · Shift+Enter new line · AI can make mistakes",
    errLoad: "Could not load the assistant library — check your internet connection and reopen the chat",
    errNotReady: "Assistant library not loaded yet — wait a moment and try again",
    errNoReply: "No reply received — try another model or try again",
    errConnect: "Could not reach the model",
    errTail: "— try another model or try again",
    pdfRead: "Reading PDF…",
    tooBig: "File too large (max " + MAX_FILE_MB + " MB)",
    maxFiles: "Maximum " + MAX_ATTACHMENTS + " attachments per message",
    badType: "Only images and PDF files are supported",
    langAnswer: "Answer in clear English.",
  },
  ar: {
    title: "مساعد الرياضيات",
    knows: "يجيب وفق التمرين",
    newChat: "محادثة جديدة",
    close: "إغلاق الدردشة",
    moveSide: "نقل الدردشة إلى الجهة الأخرى",
    placeholder: "اسأل عن التمرين المعروض…",
    stop: "إيقاف التوليد",
    send: "إرسال (Enter)",
    typing: "جارٍ الكتابة…",
    deepThinking: "يفكر بعمق في المسألة… قد يستغرق حتى دقيقة ⏳",
    searchingWeb: "يبحث في الويب…",
    emptyTitle: "كيف أساعدك في هذا التمرين؟",
    emptyHint: "أعرف نص التمرين المعروض أمامك — اسأل مباشرة.",
    signin: "عند أول رسالة قد تظهر نافذة تسجيل دخول Puter المجانية (مرة واحدة فقط).",
    q1: "اشرح لي المطلوب في هذا التمرين بوضوح",
    q2: "أعطني تلميحًا دون كشف الحل الكامل",
    q3: "حل هذا التمرين خطوة بخطوة بالتفصيل",
    q4: "اقترح لي تمرينًا مشابهًا للتدريب",
    web: "بحث ويب",
    think: "تفكير",
    attach: "إرفاق صورة أو PDF",
    copy: "نسخ",
    copied: "تم النسخ ✓",
    footer: "مجاني عبر Puter · Enter للإرسال · Shift+Enter سطر جديد · قد يخطئ المساعد",
    errLoad: "تعذر تحميل مكتبة المساعد — تحقق من الاتصال ثم أعد فتح الدردشة",
    errNotReady: "مكتبة المساعد لم تُحمَّل بعد — انتظر لحظات ثم أعد المحاولة",
    errNoReply: "لم يصل أي رد — جرّب نموذجًا آخر أو أعد المحاولة",
    errConnect: "تعذر الاتصال بالنموذج",
    errTail: "— جرّب نموذجًا آخر أو أعد المحاولة",
    pdfRead: "جارٍ قراءة PDF…",
    tooBig: "الملف كبير جدًا (الحد " + MAX_FILE_MB + " MB)",
    maxFiles: "الحد الأقصى " + MAX_ATTACHMENTS + " مرفقات للرسالة",
    badType: "المدعوم فقط: الصور وملفات PDF",
    langAnswer: "أجب بالعربية الواضحة، مع إبقاء المصطلحات العلمية بالفرنسية أو الإنجليزية عند الحاجة.",
  },
  fr: {
    title: "Assistant Maths",
    knows: "Répond sur l'exercice",
    newChat: "Nouvelle discussion",
    close: "Fermer",
    moveSide: "Déplacer le chat de l'autre côté",
    placeholder: "Posez une question sur cet exercice…",
    stop: "Arrêter",
    send: "Envoyer (Entrée)",
    typing: "Écriture…",
    deepThinking: "Réflexion approfondie… jusqu'à une minute ⏳",
    searchingWeb: "Recherche sur le web…",
    emptyTitle: "Comment puis-je aider sur cet exercice ?",
    emptyHint: "Je connais l'énoncé affiché — demandez directement.",
    signin: "Au premier message, une fenêtre de connexion Puter gratuite peut apparaître (une seule fois).",
    q1: "Explique clairement ce qui est demandé dans cet exercice",
    q2: "Donne-moi un indice sans révéler la solution",
    q3: "Résous cet exercice étape par étape en détail",
    q4: "Propose un exercice similaire pour m'entraîner",
    web: "Recherche web",
    think: "Réflexion",
    attach: "Joindre une image ou un PDF",
    copy: "Copier",
    copied: "Copié ✓",
    footer: "Gratuit via Puter · Entrée pour envoyer · l'IA peut se tromper",
    errLoad: "Impossible de charger la bibliothèque — vérifiez la connexion et rouvrez le chat",
    errNotReady: "Bibliothèque pas encore chargée — patientez puis réessayez",
    errNoReply: "Aucune réponse — essayez un autre modèle ou réessayez",
    errConnect: "Connexion au modèle impossible",
    errTail: "— essayez un autre modèle ou réessayez",
    pdfRead: "Lecture du PDF…",
    tooBig: "Fichier trop volumineux (max " + MAX_FILE_MB + " MB)",
    maxFiles: "Maximum " + MAX_ATTACHMENTS + " pièces jointes par message",
    badType: "Seuls les images et les PDF sont acceptés",
    langAnswer: "Réponds en français clair.",
  },
};

/** تحويل \(..\) و \[..\] إلى $..$ و $$..$$ حتى يعرضها KaTeX دائمًا */
function normalizeAiMath(src: string): string {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => "\n$$\n" + body + "\n$$\n")
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => "$" + body + "$");
}

/** عرض Markdown + LaTeX (KaTeX) — يُستعمل أيضًا أثناء البث المباشر */
function AiMarkdown({ content, rtl }: { content: string; rtl: boolean }) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => <ul className="my-2 ms-5 list-disc" {...props} />,
          ol: (props) => <ol className="my-2 ms-5 list-decimal" {...props} />,
          li: (props) => <li className="my-0.5" {...props} />,
          h1: (props) => (
            <p className="my-2 text-[1.05em] font-bold" {...props} />
          ),
          h2: (props) => (
            <p className="my-2 text-[1.05em] font-bold" {...props} />
          ),
          h3: (props) => <p className="my-2 font-bold" {...props} />,
          a: (props) => (
            <a
              className="underline underline-offset-2 opacity-90 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              dir="ltr"
              className="my-2 overflow-x-auto rounded-lg bg-black/20 p-3 text-left font-mono text-[0.85em] leading-5 dark:bg-black/40"
              {...props}
            />
          ),
          code: (props) => (
            <code
              dir="ltr"
              className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-collapse text-[0.95em]" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-current/20 px-2 py-1" {...props} />
          ),
          td: (props) => (
            <td className="border border-current/20 px-2 py-1" {...props} />
          ),
        }}
      >
        {normalizeAiMath(content)}
      </ReactMarkdown>
    </div>
  );
}

/** استخراج نص PDF في المتصفح عبر pdf.js (يُحمَّل عند أول استعمال فقط) */
async function extractPdfText(
  file: File,
): Promise<{ text: string; pages: number }> {
  if (!window.pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("pdf.js load failed"));
      document.head.appendChild(s);
    });
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const buf = await file.arrayBuffer();
  const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  const maxPages = Math.min(doc.numPages, 20);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
    if (out.length > 20000) break;
  }
  return { text: out.slice(0, 20000), pages: doc.numPages };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

type Props = {
  dark: boolean;
  topicTitle: string;
  problem: ReadingProblem;
  onClose: () => void;
  side: "left" | "right";
  onToggleSide: () => void;
};

export function ReadingChat({
  dark,
  topicTitle,
  problem,
  onClose,
  side,
  onToggleSide,
}: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-5.6-terra");
  const [webSearch, setWebSearch] = useState(false);
  const [think, setThink] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const stopRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const t = T[lang];
  const rtl = lang === "ar";

  // لوحة ألوان متناسقة مع وضع القراءة
  const pal = dark
    ? {
        root: "border-slate-700 bg-[#0e1628] text-slate-100",
        line: "border-slate-700",
        soft: "text-slate-400",
        userBubble: "border border-sky-400/25 bg-sky-500/15",
        composer:
          "border-slate-700 bg-slate-900/70 focus-within:border-sky-400",
        chip: "border-slate-700 text-slate-300 hover:border-sky-400 hover:text-sky-300",
        pillOn: "border-sky-400 bg-sky-500/20 text-sky-300",
        send: "bg-sky-500 text-white hover:bg-sky-400",
        select: "border-slate-700 bg-slate-900 text-slate-200",
        avatar:
          "bg-gradient-to-br from-sky-500/40 to-indigo-500/40 text-sky-200",
      }
    : {
        root: "border-slate-200 bg-white text-slate-900",
        line: "border-slate-200",
        soft: "text-slate-500",
        userBubble: "border border-blue-600/15 bg-blue-50",
        composer: "border-slate-300 bg-white focus-within:border-blue-600",
        chip: "border-slate-300 text-slate-600 hover:border-blue-600 hover:text-blue-700",
        pillOn: "border-blue-600 bg-blue-50 text-blue-700",
        send: "bg-blue-600 text-white hover:bg-blue-500",
        select: "border-slate-300 bg-white text-slate-700",
        avatar: "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700",
      };

  // تحميل Puter.js + استرجاع التفضيلات
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem("rm-chat-model");
      if (savedModel && MODELS.some((m) => m.id === savedModel)) {
        setModel(savedModel);
      }
      const savedLang = localStorage.getItem("rm-chat-lang");
      if (savedLang === "en" || savedLang === "ar" || savedLang === "fr") {
        setLang(savedLang);
      }
      if (localStorage.getItem("rm-chat-web") === "1") setWebSearch(true);
      if (localStorage.getItem("rm-chat-think") === "1") setThink(true);
    } catch {
      // تجاهل
    }
    if (typeof window !== "undefined" && window.puter) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="' + PUTER_SRC + '"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      if (window.puter) setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = PUTER_SRC;
    s.async = true;
    s.onload = () => setReady(true);
    s.onerror = () => setError(T.en.errLoad);
    document.head.appendChild(s);
  }, []);

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, streamText, busy]);

  function persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // تجاهل
    }
  }

  /** النموذج الفعلي حسب المفاتيح: بحث ويب → Sonar، تفكير → -pro */
  function effectiveModel(): string {
    if (webSearch) {
      return think ? "perplexity/sonar-reasoning-pro" : "perplexity/sonar-pro";
    }
    if (think) return PRO_MAP[model] ?? model;
    return model;
  }

  function systemPrompt(): string {
    const parts = [
      "You are an expert mathematics professor helping students prepare for doctoral entrance exams in mathematics.",
      "- " + t.langAnswer,
      "- Write ALL mathematical symbols and equations in LaTeX: $...$ for inline and $$...$$ for display equations. Never use \\(..\\) or \\[..\\].",
      "- Organize answers in clear numbered steps and be mathematically rigorous.",
      "- If the user asks for a hint only, do not reveal the full solution.",
      "",
      "Current topic: " + topicTitle,
      "Exercise " +
        problem.problemNumber +
        (problem.title ? " (" + problem.title + ")" : "") +
        ":",
      problem.statement,
    ];
    if (problem.remark) parts.push("Attached remark: " + problem.remark);
    return parts.join("\n");
  }

  /** تحويل رسالة إلى صيغة API (مع الصور ونصوص PDF) */
  function toApiMessage(m: ChatMsg): any {
    let text = m.content;
    const images: any[] = [];
    for (const a of m.attachments ?? []) {
      if (a.kind === "pdf") {
        text +=
          '\n\n[Attached PDF "' +
          a.name +
          '" (' +
          a.pages +
          " pages) content]:\n" +
          a.text;
      } else {
        images.push({ type: "image_url", image_url: { url: a.dataUrl } });
      }
    }
    if (images.length === 0) return { role: m.role, content: text };
    return {
      role: m.role,
      content: [{ type: "text", text }, ...images],
    };
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    if (fileRef.current) fileRef.current.value = "";
    for (const f of list) {
      if (attachments.length + list.indexOf(f) >= MAX_ATTACHMENTS) {
        setError(t.maxFiles);
        break;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setError(t.tooBig);
        continue;
      }
      try {
        if (f.type.startsWith("image/")) {
          const dataUrl = await readAsDataUrl(f);
          setAttachments((cur) =>
            cur.length >= MAX_ATTACHMENTS
              ? cur
              : [...cur, { kind: "image", name: f.name, dataUrl }],
          );
        } else if (
          f.type === "application/pdf" ||
          f.name.toLowerCase().endsWith(".pdf")
        ) {
          setAttachBusy(true);
          const { text, pages } = await extractPdfText(f);
          setAttachments((cur) =>
            cur.length >= MAX_ATTACHMENTS
              ? cur
              : [...cur, { kind: "pdf", name: f.name, text, pages }],
          );
        } else {
          setError(t.badType);
        }
      } catch {
        setError(t.errConnect + " (" + f.name + ")");
      } finally {
        setAttachBusy(false);
      }
    }
  }

  async function send(quick?: string) {
    const q = (quick ?? input).trim();
    if ((!q && attachments.length === 0) || busy) return;
    if (!ready || !window.puter) {
      setError(t.errNotReady);
      return;
    }
    setError(null);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    const userMsg: ChatMsg = {
      role: "user",
      content: q,
      attachments: attachments.length > 0 ? attachments : undefined,
      problemNumber: problem.problemNumber,
    };
    setAttachments([]);
    const history = [...msgs, userMsg];
    setMsgs(history);
    setBusy(true);
    setStreamText("");
    stopRef.current = false;

    const usedModel = effectiveModel();
    const apiMsgs = [
      { role: "system", content: systemPrompt() },
      ...history.map(toApiMessage),
    ];

    let full = "";
    let lastPaint = 0;
    try {
      const resp = await window.puter.ai.chat(apiMsgs, {
        model: usedModel,
        stream: true,
      });
      for await (const part of resp) {
        if (stopRef.current) break;
        const piece = (part && part.text) || "";
        if (piece) {
          full += piece;
          const now = Date.now();
          // رسم كل 120ms فقط — بث سريع وسلس حتى مع معادلات طويلة
          if (now - lastPaint > 120) {
            lastPaint = now;
            setStreamText(full);
          }
        }
      }
      if (full.trim().length === 0 && !stopRef.current) {
        setError(t.errNoReply);
      }
    } catch (err: any) {
      const raw =
        (err && (err.message || (err.error && err.error.message))) || "";
      setError(
        t.errConnect +
          (typeof raw === "string" && raw ? ": " + raw : "") +
          " " +
          t.errTail,
      );
    }
    if (full.trim().length > 0) {
      setMsgs((cur) => [
        ...cur,
        {
          role: "assistant",
          content: full,
          model: usedModel,
          problemNumber: problem.problemNumber,
        },
      ]);
    }
    setStreamText("");
    setBusy(false);
  }

  async function copyMsg(i: number, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      // تجاهل
    }
  }

  const quickPrompts = [
    { icon: "📖", text: t.q1 },
    { icon: "💡", text: t.q2 },
    { icon: "✍️", text: t.q3 },
    { icon: "🔁", text: t.q4 },
  ];

  const iconBtn =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] transition " +
    pal.chip;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={
        "flex h-full w-full flex-col shadow-2xl " +
        (side === "left" ? "border-e " : "border-s ") +
        pal.root
      }
    >
      {/* ===== الرأس ===== */}
      <header
        className={"flex items-center gap-2 border-b px-3 py-2 " + pal.line}
      >
        <div
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm shadow-sm " +
            pal.avatar
          }
        >
          ✨
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{t.title}</p>
          <p className={"truncate text-[10px] " + pal.soft}>
            {t.knows} {problem.problemNumber}
          </p>
        </div>
        <select
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            persist("rm-chat-model", e.target.value);
          }}
          title="Model"
          className={
            "max-w-28 cursor-pointer rounded-lg border px-1.5 py-1 text-[10px] outline-none " +
            pal.select
          }
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          title={t.moveSide}
          onClick={onToggleSide}
          className={iconBtn + " hidden lg:flex"}
        >
          ⇆
        </button>
        <button
          type="button"
          title={t.newChat}
          onClick={() => {
            setMsgs([]);
            setError(null);
          }}
          className={iconBtn}
        >
          🗑️
        </button>
        <button
          type="button"
          title={t.close}
          onClick={onClose}
          className={iconBtn + " hover:!border-red-500 hover:!text-red-500"}
        >
          ✕
        </button>
      </header>

      {/* ===== الرسائل ===== */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {msgs.length === 0 && !busy ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
            <div
              className={
                "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-md " +
                pal.avatar
              }
            >
              ✨
            </div>
            <div>
              <p className="text-sm font-bold">{t.emptyTitle}</p>
              <p className={"mt-1 text-[11px] leading-5 " + pal.soft}>
                {t.emptyHint}
                <br />
                {t.signin}
              </p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.text}
                  type="button"
                  onClick={() => send(qp.text)}
                  className={
                    "rounded-xl border px-3 py-2 text-start text-[11px] leading-5 transition hover:scale-[1.02] " +
                    pal.chip
                  }
                >
                  {qp.icon} {qp.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="flex justify-start duration-200 animate-in fade-in slide-in-from-bottom-1"
                >
                  <div
                    className={
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-6 " +
                      (rtl ? "rounded-tr-md " : "rounded-tl-md ") +
                      pal.userBubble
                    }
                  >
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1.5">
                        {m.attachments.map((a, k) =>
                          a.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={k}
                              src={a.dataUrl}
                              alt={a.name}
                              className="max-h-28 rounded-lg border border-current/10"
                            />
                          ) : (
                            <span
                              key={k}
                              className="rounded-md border border-current/20 px-1.5 py-0.5 text-[10px]"
                            >
                              📄 {a.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className="flex gap-2 duration-200 animate-in fade-in slide-in-from-bottom-1"
                >
                  <div
                    className={
                      "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] " +
                      pal.avatar
                    }
                  >
                    ✨
                  </div>
                  <div className="min-w-0 flex-1 text-[13px] leading-7">
                    <AiMarkdown content={m.content} rtl={rtl} />
                    <div
                      className={
                        "mt-1 flex items-center gap-2 text-[9px] " + pal.soft
                      }
                    >
                      <span dir="ltr">{m.model}</span>
                      <button
                        type="button"
                        onClick={() => copyMsg(i, m.content)}
                        className="rounded px-1 py-0.5 transition hover:bg-current/10"
                      >
                        {copiedIdx === i ? t.copied : "📋 " + t.copy}
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}

            {/* الرسالة قيد التوليد — LaTeX يُعرض فوريًا أثناء البث */}
            {busy && (
              <div className="flex gap-2">
                <div
                  className={
                    "mt-1 flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-full text-[11px] " +
                    pal.avatar
                  }
                >
                  ✨
                </div>
                <div className="min-w-0 flex-1 text-[13px] leading-7">
                  {streamText ? (
                    <>
                      <AiMarkdown content={streamText} rtl={rtl} />
                      <span className="inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-current align-middle opacity-70" />
                    </>
                  ) : (
                    <p className={"text-[11px] " + pal.soft}>
                      {webSearch
                        ? "🌐 " + t.searchingWeb
                        : think
                          ? "🧠 " + t.deepThinking
                          : t.typing}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-[11px] leading-5 text-red-500">
            ❌ {error}
          </p>
        )}
      </div>

      {/* ===== أزرار الأدوات + اللغة ===== */}
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5">
        <button
          type="button"
          title={t.web}
          onClick={() => {
            setWebSearch((v) => {
              persist("rm-chat-web", v ? "0" : "1");
              return !v;
            });
          }}
          className={
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition " +
            (webSearch ? pal.pillOn : pal.chip)
          }
        >
          🌐 {t.web}
        </button>
        <button
          type="button"
          title={t.think}
          onClick={() => {
            setThink((v) => {
              persist("rm-chat-think", v ? "0" : "1");
              return !v;
            });
          }}
          className={
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition " +
            (think ? pal.pillOn : pal.chip)
          }
        >
          🧠 {t.think}
        </button>
        <span className="flex-1" />
        <select
          value={lang}
          onChange={(e) => {
            setLang(e.target.value as Lang);
            persist("rm-chat-lang", e.target.value);
          }}
          title="Language"
          className={
            "cursor-pointer rounded-lg border px-1.5 py-0.5 text-[10px] outline-none " +
            pal.select
          }
        >
          <option value="en">🇬🇧 English</option>
          <option value="ar">🇩🇿 العربية</option>
          <option value="fr">🇫🇷 Français</option>
        </select>
      </div>

      {/* ===== حقل الإدخال ===== */}
      <footer className={"border-t p-2.5 pt-2 " + pal.line}>
        {(attachments.length > 0 || attachBusy) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {attachments.map((a, k) => (
              <span
                key={k}
                className={
                  "flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] " +
                  pal.chip
                }
              >
                {a.kind === "image" ? "🖼️" : "📄"}{" "}
                <span className="max-w-24 truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((cur) => cur.filter((_x, j) => j !== k))
                  }
                  className="opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </span>
            ))}
            {attachBusy && (
              <span className={"text-[10px] " + pal.soft}>{t.pdfRead}</span>
            )}
          </div>
        )}
        <div
          className={
            "flex items-end gap-1.5 rounded-2xl border px-2.5 py-2 transition " +
            pal.composer
          }
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            title={t.attach}
            onClick={() => fileRef.current?.click()}
            disabled={busy || attachBusy}
            className={
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm transition disabled:opacity-40 " +
              pal.chip
            }
          >
            📎
          </button>
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            disabled={busy}
            placeholder={t.placeholder}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1 resize-none bg-transparent text-[13px] leading-6 outline-none placeholder:opacity-50 disabled:opacity-50"
          />
          {busy ? (
            <button
              type="button"
              title={t.stop}
              onClick={() => {
                stopRef.current = true;
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs text-white transition hover:bg-red-400"
            >
              ⏹
            </button>
          ) : (
            <button
              type="button"
              title={t.send}
              onClick={() => send()}
              disabled={(!input.trim() && attachments.length === 0) || !ready}
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition disabled:opacity-40 " +
                pal.send
              }
            >
              ↑
            </button>
          )}
        </div>
        <p className={"mt-1.5 text-center text-[9px] " + pal.soft}>{t.footer}</p>
      </footer>
    </div>
  );
}
