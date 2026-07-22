"use client";

// DocMath AI — Notion AI style reading assistant
// AI backend: Azure Foundry (DeepSeek-V3.2) via the secure /api/chat route.
// The Azure API key lives only on the server — never in this file.
import { useEffect, useRef, useState, type ReactNode } from "react";
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

const PDFJS_SRC =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_FILE_MB = 5;
const MAX_ATTACHMENTS = 4;

const T: Record<Lang, Record<string, string>> = {
  en: {
    title: "DocMath AI",
    newChat: "New chat",
    close: "Close",
    moveSide: "Move to other side",
    placeholder: "Ask a question about this exercise…",
    stop: "Stop",
    send: "Send",
    typing: "Thinking…",
    deepThinking: "Thinking deeply…",
    searchingWeb: "Searching the web…",
    emptyHint: "Ask anything about the exercise on the page.",
    signin:
      "AI answers are temporarily offline while we connect a new provider.",
    offline:
      "AI is temporarily disabled. The chat design stays ready — a new API will be connected soon.",
    q1: "Summarize this exercise",
    q2: "Give me a hint",
    q3: "Solve step by step",
    q4: "Suggest a similar exercise",
    web: "Web search",
    think: "Thinking",
    attach: "Attach",
    copy: "Copy",
    copied: "Copied",
    footer: "AI can make mistakes. Check important steps.",
    errLoad: "Could not load the assistant. Check your connection.",
    errNotReady: "Assistant is still loading. Try again in a moment.",
    errNoReply: "No reply received. Try another model.",
    errConnect: "Could not reach the model",
    errTail: "— try again",
    errSignin: "Please sign in to use DocMath AI.",
    errLimitChat: "Daily chat limit reached. Come back tomorrow.",
    errLimitImages: "Daily image limit reached (5 images per day).",
    errLimitFiles: "Daily file limit reached (3 files per day).",
    pdfRead: "Reading PDF…",
    tooBig: `File too large (max ${MAX_FILE_MB} MB)`,
    maxFiles: `Maximum ${MAX_ATTACHMENTS} attachments`,
    badType: "Only images and PDF files are supported",
    langAnswer: "Answer in clear English.",
    more: "More",
    model: "Model",
    language: "Language",
  },
  ar: {
    title: "DocMath AI",
    newChat: "محادثة جديدة",
    close: "إغلاق",
    moveSide: "نقل إلى الجهة الأخرى",
    placeholder: "اسأل عن التمرين المعروض…",
    stop: "إيقاف",
    send: "إرسال",
    typing: "يفكر…",
    deepThinking: "يفكر بعمق…",
    searchingWeb: "يبحث في الويب…",
    emptyHint: "اسأل أي شيء عن التمرين المعروض في الصفحة.",
    signin: "إجابات الذكاء الاصطناعي متوقفة مؤقتًا ريثما نربط مزوّدًا جديدًا.",
    offline:
      "الذكاء الاصطناعي متوقف مؤقتًا. التصميم جاهز — سيتم ربط API جديد قريبًا.",
    q1: "لخّص هذا التمرين",
    q2: "أعطني تلميحًا",
    q3: "حل خطوة بخطوة",
    q4: "اقترح تمرينًا مشابهًا",
    web: "بحث ويب",
    think: "تفكير",
    attach: "إرفاق",
    copy: "نسخ",
    copied: "تم النسخ",
    footer: "قد يخطئ المساعد. راجع الخطوات المهمة.",
    errLoad: "تعذر تحميل المساعد. تحقق من الاتصال.",
    errNotReady: "المساعد ما زال يُحمَّل. حاول بعد لحظات.",
    errNoReply: "لم يصل رد. جرّب نموذجًا آخر.",
    errConnect: "تعذر الاتصال بالنموذج",
    errTail: "— أعد المحاولة",
    errSignin: "سجّل الدخول أولًا لاستخدام DocMath AI.",
    errLimitChat: "بلغت حدّ المحادثة اليومي. عُد غدًا.",
    errLimitImages: "بلغت الحدّ اليومي للصور (5 صور في اليوم).",
    errLimitFiles: "بلغت الحدّ اليومي للملفات (3 ملفات في اليوم).",
    pdfRead: "جارٍ قراءة PDF…",
    tooBig: `الملف كبير جدًا (الحد ${MAX_FILE_MB} MB)`,
    maxFiles: `الحد الأقصى ${MAX_ATTACHMENTS} مرفقات`,
    badType: "المدعوم: الصور وملفات PDF فقط",
    langAnswer:
      "أجب بالعربية الواضحة، مع إبقاء المصطلحات العلمية بالفرنسية أو الإنجليزية عند الحاجة.",
    more: "المزيد",
    model: "النموذج",
    language: "اللغة",
  },
  fr: {
    title: "DocMath AI",
    newChat: "Nouvelle discussion",
    close: "Fermer",
    moveSide: "Déplacer de l'autre côté",
    placeholder: "Posez une question sur cet exercice…",
    stop: "Arrêter",
    send: "Envoyer",
    typing: "Réflexion…",
    deepThinking: "Réflexion approfondie…",
    searchingWeb: "Recherche sur le web…",
    emptyHint: "Posez n'importe quelle question sur l'exercice affiché.",
    signin:
      "Les réponses IA sont temporairement hors ligne le temps de connecter un nouveau fournisseur.",
    offline:
      "L'IA est temporairement désactivée. Le design reste prêt — une nouvelle API sera connectée bientôt.",
    q1: "Résumer cet exercice",
    q2: "Donner un indice",
    q3: "Résoudre étape par étape",
    q4: "Proposer un exercice similaire",
    web: "Recherche web",
    think: "Réflexion",
    attach: "Joindre",
    copy: "Copier",
    copied: "Copié",
    footer: "L'IA peut se tromper. Vérifiez les étapes importantes.",
    errLoad: "Impossible de charger l'assistant. Vérifiez la connexion.",
    errNotReady: "L'assistant charge encore. Réessayez.",
    errNoReply: "Aucune réponse. Essayez un autre modèle.",
    errConnect: "Connexion au modèle impossible",
    errTail: "— réessayez",
    errSignin: "Connectez-vous pour utiliser DocMath AI.",
    errLimitChat: "Limite quotidienne du chat atteinte. Revenez demain.",
    errLimitImages: "Limite quotidienne d'images atteinte (5 par jour).",
    errLimitFiles: "Limite quotidienne de fichiers atteinte (3 par jour).",
    pdfRead: "Lecture du PDF…",
    tooBig: `Fichier trop volumineux (max ${MAX_FILE_MB} MB)`,
    maxFiles: `Maximum ${MAX_ATTACHMENTS} pièces jointes`,
    badType: "Images et PDF uniquement",
    langAnswer: "Réponds en français clair.",
    more: "Plus",
    model: "Modèle",
    language: "Langue",
  },
};

function normalizeAiMath(src: string): string {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => "\n$$\n" + body + "\n$$\n")
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => "$" + body + "$");
}

function AiMarkdown({ content, rtl }: { content: string; rtl: boolean }) {
  return (
    <div dir={rtl ? "rtl" : "ltr"} className="notion-ai-md break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: (props) => (
            <p className="my-2.5 text-[15.5px] leading-[1.7]" {...props} />
          ),
          ul: (props) => (
            <ul className="my-2.5 ms-5 list-disc space-y-1.5" {...props} />
          ),
          ol: (props) => (
            <ol className="my-2.5 ms-5 list-decimal space-y-1.5" {...props} />
          ),
          li: (props) => (
            <li className="text-[15.5px] leading-[1.7]" {...props} />
          ),
          h1: (props) => (
            <p className="mb-2 mt-4 text-[16.5px] font-semibold" {...props} />
          ),
          h2: (props) => (
            <p className="mb-2 mt-4 text-[16px] font-semibold" {...props} />
          ),
          h3: (props) => (
            <p className="mb-1.5 mt-3 text-[15.5px] font-semibold" {...props} />
          ),
          strong: (props) => <strong className="font-semibold" {...props} />,
          a: (props) => (
            <a
              className="underline decoration-current/30 underline-offset-2 hover:decoration-current"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              dir="ltr"
              className="my-3 overflow-x-auto rounded-md bg-black/[0.04] p-3 text-left font-mono text-[12.5px] leading-5 dark:bg-white/[0.06]"
              {...props}
            />
          ),
          code: (props) => (
            <code
              dir="ltr"
              className="rounded-[4px] bg-black/[0.06] px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/[0.08]"
              {...props}
            />
          ),
          table: (props) => (
            <div className="my-3 overflow-x-auto">
              <table
                className="w-full border-collapse text-[13.5px]"
                {...props}
              />
            </div>
          ),
          th: (props) => (
            <th
              className="border border-black/10 px-2 py-1.5 text-start font-semibold dark:border-white/10"
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="border border-black/10 px-2 py-1.5 dark:border-white/10"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-3 border-s-2 border-black/15 ps-3 text-[14px] opacity-90 dark:border-white/15"
              {...props}
            />
          ),
        }}
      >
        {normalizeAiMath(content)}
      </ReactMarkdown>
    </div>
  );
}

/** Notion-style sparkle mark */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M10 1.5c.3 0 .55.2.64.48l1.05 3.4c.2.66.72 1.18 1.38 1.38l3.4 1.05a.67.67 0 0 1 0 1.28l-3.4 1.05a2.1 2.1 0 0 0-1.38 1.38l-1.05 3.4a.67.67 0 0 1-1.28 0l-1.05-3.4a2.1 2.1 0 0 0-1.38-1.38l-3.4-1.05a.67.67 0 0 1 0-1.28l3.4-1.05a2.1 2.1 0 0 0 1.38-1.38l1.05-3.4A.67.67 0 0 1 10 1.5Z" />
    </svg>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  className = "",
  disabled,
}: {
  title: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[15px] text-current/55 transition hover:bg-black/[0.06] hover:text-current/90 disabled:opacity-40 dark:hover:bg-white/[0.08] " +
        className
      }
    >
      {children}
    </button>
  );
}

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
  const [lang, setLang] = useState<Lang>("ar");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachBusy, setAttachBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  // AI backend: Azure Foundry (DeepSeek) via /api/chat — no client-side keys
  const [ready] = useState(true);
  const AI_ENABLED = true;
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const stopRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const t = T[lang];
  const rtl = lang === "ar";

  // Notion AI palette (light + dark)
  const pal = dark
    ? {
        root: "border-[#2f2f2f] bg-[#191919] text-[#e8e8e8]",
        line: "border-[#2f2f2f]",
        soft: "text-[#9b9b9b]",
        muted: "text-[#787878]",
        surface: "bg-[#202020]",
        surface2: "bg-[#252525]",
        chip: "border-[#3a3a3a] bg-transparent text-[#d4d4d4] hover:bg-[#2a2a2a]",
        chipOn: "border-[#5a5a5a] bg-[#2f2f2f] text-[#f0f0f0]",
        user: "bg-[#2a2a2a] text-[#ececec]",
        composer:
          "border-[#3a3a3a] bg-[#202020] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_rgba(0,0,0,0.35)] focus-within:border-[#555]",
        send: "bg-[#e8e8e8] text-[#191919] hover:bg-white disabled:bg-[#333] disabled:text-[#777]",
        stop: "bg-[#e8e8e8] text-[#191919] hover:bg-white",
        select: "bg-transparent text-[#cfcfcf]",
        menu: "border-[#3a3a3a] bg-[#252525] shadow-xl",
        sparkle: "text-[#b8a4ff]",
        divider: "bg-[#2f2f2f]",
      }
    : {
        root: "border-[#e9e9e7] bg-[#ffffff] text-[#37352f]",
        line: "border-[#e9e9e7]",
        soft: "text-[#787774]",
        muted: "text-[#9b9a97]",
        surface: "bg-[#f7f7f5]",
        surface2: "bg-[#f1f1ef]",
        chip: "border-[#e3e2e0] bg-white text-[#37352f] hover:bg-[#f7f7f5]",
        chipOn: "border-[#d3d1cb] bg-[#f1f1ef] text-[#37352f]",
        user: "bg-[#f1f1ef] text-[#37352f]",
        composer:
          "border-[#e3e2e0] bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.03),0_8px_24px_rgba(15,15,15,0.06)] focus-within:border-[#cfcfc8] focus-within:shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_10px_28px_rgba(15,15,15,0.08)]",
        send: "bg-[#9065b0] text-white hover:bg-[#7d559c] disabled:bg-[#e3e2e0] disabled:text-[#9b9a97]",
        stop: "bg-[#37352f] text-white hover:bg-black",
        select: "bg-transparent text-[#787774]",
        menu: "border-[#e3e2e0] bg-white shadow-[0_12px_40px_rgba(15,15,15,0.12)]",
        sparkle: "text-[#9065b0]",
        divider: "bg-[#e9e9e7]",
      };

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("rm-chat-lang");
      if (savedLang === "en" || savedLang === "ar" || savedLang === "fr") {
        setLang(savedLang);
      }
      if (localStorage.getItem("rm-chat-web") === "1") setWebSearch(true);
    } catch {
      // ignore
    }
    // Puter intentionally not loaded — AI backend paused
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, streamText, busy]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function persist(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  function systemPrompt(): string {
    const parts = [
      "You are an expert mathematics professor helping students prepare for doctoral entrance exams in mathematics.",
      "- " + t.langAnswer,
      ...(rtl
        ? [
            "- Arabic writing rules: write prose fully in Arabic (right-to-left), and put EVERY formula, variable, symbol, or numeric expression inside LaTeX $...$ or $$...$$ so it renders left-to-right correctly. Never mix bare math symbols inside Arabic sentences.",
          ]
        : []),
      "- Write ALL mathematical symbols and equations in LaTeX: $...$ for inline and $$...$$ for display equations. Never use \\(..\\) or \\[..\\].",
      "- Organize answers in clear numbered steps and be mathematically rigorous.",
      "- If the user asks for a hint only, do not reveal the full solution.",
      "- Match Notion AI tone: clear, calm, professional, concise where possible.",
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

  function toApiMessage(m: ChatMsg): any {
    // PDFs are sent as extracted text; images are sent as image parts.
    // الخادم هو من يقرر أي نموذج يستقبلها أو يحولها إلى نص عند الحاجة
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
    return { role: m.role, content: [{ type: "text", text }, ...images] };
  }

  /** يضغط الصورة (أقصى بعد 1280px، JPEG) حتى لا يتجاوز الطلب حدود الخادم */
  function compressImage(f: File): Promise<string> {
    return readAsDataUrl(f).then(
      (dataUrl) =>
        new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const maxSide = 1280;
            const scale = Math.min(
              1,
              maxSide / Math.max(img.width, img.height),
            );
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(dataUrl);
            ctx.drawImage(img, 0, 0, w, h);
            try {
              resolve(canvas.toDataURL("image/jpeg", 0.82));
            } catch {
              resolve(dataUrl);
            }
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        }),
    );
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
          const dataUrl = await compressImage(f);
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

    if (!AI_ENABLED || !ready) {
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

    const apiMsgs = [
      { role: "system", content: systemPrompt() },
      ...history.map(toApiMessage),
    ];
    const newImages = (userMsg.attachments ?? []).filter(
      (a) => a.kind === "image",
    ).length;
    const newFiles = (userMsg.attachments ?? []).filter(
      (a) => a.kind === "pdf",
    ).length;

    let full = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMsgs,
          newImages,
          newFiles,
        }),
      });
      if (!response.ok) {
        let code = "";
        let raw = "";
        try {
          const data = await response.json();
          code = typeof data?.code === "string" ? data.code : "";
          raw = typeof data?.error === "string" ? data.error : "";
        } catch {
          // ignore body parse errors
        }
        const e: any = new Error(raw || "Request failed: " + response.status);
        e.code = code;
        throw e;
      }
      // بث مباشر: نقرأ الرد قطعة قطعة ونعرضه فورًا (مثل الطريقة السابقة)
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lastPaint = 0;
        while (true) {
          if (stopRef.current) {
            try {
              await reader.cancel();
            } catch {
              // ignore
            }
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          const now = Date.now();
          if (now - lastPaint > 60) {
            lastPaint = now;
            setStreamText(full);
          }
        }
        setStreamText(full);
      } else {
        const data = await response.json();
        full = typeof data?.answer === "string" ? data.answer : "";
        setStreamText(full);
      }
      if (full.trim().length === 0 && !stopRef.current) {
        setError(t.errNoReply);
      }
    } catch (err: any) {
      const code = err && err.code;
      if (code === "signin_required") setError(t.errSignin);
      else if (code === "limit_messages" || code === "rate_limited")
        setError(t.errLimitChat);
      else if (code === "limit_images") setError(t.errLimitImages);
      else if (code === "limit_files") setError(t.errLimitFiles);
      else {
        const raw =
          (err && (err.message || (err.error && err.error.message))) || "";
        setError(
          t.errConnect +
            (typeof raw === "string" && raw ? ": " + raw : "") +
            " " +
            t.errTail,
        );
      }
    }
    if (full.trim().length > 0) {
      setMsgs((cur) => [
        ...cur,
        {
          role: "assistant",
          content: full,
          model: "auto",
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
      setTimeout(() => setCopiedIdx(null), 1400);
    } catch {
      // ignore
    }
  }

  const quickPrompts = [
    { text: t.q1 },
    { text: t.q2 },
    { text: t.q3 },
    { text: t.q4 },
  ];

  const borderSide = side === "left" ? "border-e" : "border-s";

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={"flex h-full w-full flex-col " + borderSide + " " + pal.root}
      style={{
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      {/* ===== Header — Notion AI ===== */}
      <header
        className={
          "flex h-11 shrink-0 items-center gap-1 border-b px-2.5 " + pal.line
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 ps-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt=""
            className="h-5 w-5 rounded-[5px] object-contain"
          />
          <p className="truncate text-[14.5px] font-semibold tracking-[-0.01em]">
            {t.title}
          </p>
        </div>

        <IconBtn
          title={t.moveSide}
          onClick={onToggleSide}
          className="hidden lg:inline-flex"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M5.5 3.5 2 7l3.5 3.5M10.5 3.5 14 7l-3.5 3.5M2 7h12"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconBtn>

        <div className="relative" ref={menuRef}>
          <IconBtn title={t.more} onClick={() => setMenuOpen((v) => !v)}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden
            >
              <circle cx="3.5" cy="8" r="1.25" />
              <circle cx="8" cy="8" r="1.25" />
              <circle cx="12.5" cy="8" r="1.25" />
            </svg>
          </IconBtn>
          {menuOpen && (
            <div
              className={
                "absolute end-0 top-8 z-20 w-52 overflow-hidden rounded-lg border py-1 " +
                pal.menu
              }
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                onClick={() => {
                  setMsgs([]);
                  setError(null);
                  setMenuOpen(false);
                }}
              >
                <span className="opacity-60">＋</span> {t.newChat}
              </button>
              <div className={"my-1 h-px " + pal.divider} />
              <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide opacity-50">
                {t.language}
              </div>
              {(
                [
                  ["en", "English"],
                  ["ar", "العربية"],
                  ["fr", "Français"],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  className={
                    "flex w-full items-center justify-between px-3 py-1.5 text-start text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] " +
                    (lang === code ? "font-medium" : "")
                  }
                  onClick={() => {
                    setLang(code);
                    persist("rm-chat-lang", code);
                    setMenuOpen(false);
                  }}
                >
                  <span>{label}</span>
                  {lang === code && (
                    <span className="text-[11px] opacity-60">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <IconBtn title={t.close} onClick={onClose}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </IconBtn>
      </header>

      {/* ===== Messages ===== */}
      <div
        ref={listRef}
        className="rm-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5"
      >
        {msgs.length === 0 && !busy ? (
          <div className="mx-auto flex h-full max-w-[420px] flex-col justify-center gap-6 px-1">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[14px] border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#252525]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dark ? "/logo-dark.png" : "/logo-light.png"}
                  alt="DocMath DZ"
                  className="h-11 w-11 object-contain"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.onerror = null;
                    el.src = "/icon.png";
                  }}
                />
              </div>
              <p className="text-[17px] font-semibold tracking-[-0.02em]">
                {t.title}
              </p>
              <p className={"mt-2 text-[14px] leading-6 " + pal.soft}>
                {t.emptyHint}
              </p>
              <p className={"mt-1.5 text-[12px] leading-5 " + pal.muted}>
                {t.signin}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.text}
                  type="button"
                  onClick={() => send(qp.text)}
                  className={
                    "group flex min-h-[44px] w-full items-center gap-3 rounded-full border px-4 text-start text-[14px] transition " +
                    pal.chip
                  }
                >
                  <span className={"opacity-70 " + pal.sparkle}>
                    <Sparkle className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{qp.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[520px] flex-col gap-5">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    className={
                      "max-w-[92%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-[1.6] " +
                      pal.user
                    }
                  >
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {m.attachments.map((a, k) =>
                          a.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={k}
                              src={a.dataUrl}
                              alt={a.name}
                              className="max-h-32 rounded-xl border border-black/5 dark:border-white/10"
                            />
                          ) : (
                            <span
                              key={k}
                              className={
                                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] " +
                                pal.chip
                              }
                            >
                              📄 {a.name}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    {m.content && (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="group/msg">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={pal.sparkle}>
                      <Sparkle className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[12px] font-medium opacity-80">
                      {t.title}
                    </span>
                  </div>
                  <div className="ps-0.5">
                    <AiMarkdown content={m.content} rtl={rtl} />
                    <div
                      className={
                        "mt-2 flex items-center gap-1 opacity-0 transition group-hover/msg:opacity-100 " +
                        pal.soft
                      }
                    >
                      <button
                        type="button"
                        onClick={() => copyMsg(i, m.content)}
                        className="rounded-md px-1.5 py-0.5 text-[11.5px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
                      >
                        {copiedIdx === i ? t.copied : t.copy}
                      </button>
                      {m.model && (
                        <span
                          className={"ms-1 text-[10.5px] " + pal.muted}
                          dir="ltr"
                        >
                          {m.model
                            .replace(/^gpt-5\.6-/, "")
                            .replace(/^perplexity\//, "")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className={"animate-pulse " + pal.sparkle}>
                    <Sparkle className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[12px] font-medium opacity-80">
                    {t.title}
                  </span>
                </div>
                {streamText ? (
                  <div className="ps-0.5">
                    <AiMarkdown content={streamText} rtl={rtl} />
                    <span
                      className={
                        "ms-0.5 inline-block h-[14px] w-[2px] animate-pulse align-middle " +
                        (dark ? "bg-[#e8e8e8]" : "bg-[#37352f]")
                      }
                    />
                  </div>
                ) : (
                  <p className={"ps-0.5 text-[13px] " + pal.soft}>
                    {webSearch ? t.searchingWeb : t.typing}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mx-auto mt-4 max-w-[520px] rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5 text-[12.5px] leading-5 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* ===== Composer — Notion AI ===== */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        {/* tool chips */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5 px-0.5">
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
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-medium transition " +
              (webSearch ? pal.chipOn : pal.chip)
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <circle
                cx="8"
                cy="8"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M2.5 8h11M8 2.5c1.6 1.8 2.4 3.6 2.4 5.5S9.6 11.7 8 13.5C6.4 11.7 5.6 9.9 5.6 8S6.4 4.3 8 2.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            {t.web}
          </button>
          <span className="flex-1" />
          <span className={"text-[11px] " + pal.muted} dir="ltr">
            DocMath AI{webSearch ? " · web" : ""}
          </span>
        </div>

        {(attachments.length > 0 || attachBusy) && (
          <div className="mb-2 flex flex-wrap gap-1.5 px-0.5">
            {attachments.map((a, k) => (
              <span
                key={k}
                className={
                  "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px] " +
                  pal.chip
                }
              >
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.dataUrl}
                    alt=""
                    className="h-5 w-5 rounded object-cover"
                  />
                ) : (
                  <span>📄</span>
                )}
                <span className="max-w-[120px] truncate">{a.name}</span>
                <button
                  type="button"
                  className="opacity-50 hover:opacity-100"
                  onClick={() =>
                    setAttachments((cur) => cur.filter((_x, j) => j !== k))
                  }
                >
                  ×
                </button>
              </span>
            ))}
            {attachBusy && (
              <span className={"text-[11.5px] " + pal.soft}>{t.pdfRead}</span>
            )}
          </div>
        )}

        <div className={"rounded-[14px] border transition " + pal.composer}>
          <div className="flex items-end gap-1 px-2 pb-2 pt-2.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <IconBtn
              title={t.attach}
              onClick={() => fileRef.current?.click()}
              disabled={busy || attachBusy}
              className="mb-0.5"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M13.2 7.4 7.55 13.05a3.2 3.2 0 0 1-4.53-4.53l6.08-6.08a2.1 2.1 0 1 1 2.97 2.97L5.8 11.68a1 1 0 0 1-1.41-1.41l5.3-5.3"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconBtn>

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
                  Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="max-h-[140px] min-h-[28px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-[1.5] outline-none placeholder:text-current/35 disabled:opacity-55"
            />

            {busy ? (
              <button
                type="button"
                title={t.stop}
                onClick={() => {
                  stopRef.current = true;
                }}
                className={
                  "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition " +
                  pal.stop
                }
              >
                <span className="block h-2.5 w-2.5 rounded-[2px] bg-current" />
              </button>
            ) : (
              <button
                type="button"
                title={t.send}
                onClick={() => send()}
                disabled={
                  (!input.trim() && attachments.length === 0) ||
                  (AI_ENABLED && !ready)
                }
                className={
                  "mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed " +
                  pal.send
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M8 12.5V3.5M8 3.5 4 7.5M8 3.5l4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <div
            className={
              "flex items-center gap-2 border-t px-2.5 py-1.5 " + pal.line
            }
          >
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as Lang);
                persist("rm-chat-lang", e.target.value);
              }}
              title={t.language}
              className={
                "cursor-pointer appearance-none rounded-md px-1.5 py-0.5 text-[11.5px] outline-none hover:bg-black/[0.04] dark:hover:bg-white/[0.06] " +
                pal.select
              }
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
            </select>
            <span className={"ms-auto text-[10.5px] " + pal.muted}>
              {t.footer}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
