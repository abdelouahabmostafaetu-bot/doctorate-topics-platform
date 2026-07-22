"use client";

// ✨ مساعد الذكاء الاصطناعي داخل وضع القراءة — دردشة بأسلوب ChatGPT الرسمي
//    تعمل عبر Puter.js بنظام «المستخدم يدفع»: كل زائر يستهلك حصته المجانية
//    من حسابه في Puter، والموقع لا يتحمل أي تكلفة. لا حاجة لأي مفاتيح API.
//    النموذج يعرف تلقائيًا نص التمرين المعروض حاليًا في وضع القراءة.
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
  }
}

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  problemNumber?: number;
  model?: string;
};

const MODELS = [
  { id: "gpt-5.6-terra", label: "⭐ Terra — سريع ومتوازن" },
  { id: "gpt-5.6-terra-pro", label: "🧠 Terra Pro — تفكير عميق" },
  { id: "gpt-5.6-sol", label: "🚀 Sol — الأقوى" },
  { id: "gpt-5.6-luna", label: "⚡ Luna — الأسرع" },
  { id: "gpt-5.5", label: "GPT-5.5" },
];

const QUICK_PROMPTS = [
  { icon: "📖", text: "اشرح لي المطلوب في هذا التمرين بوضوح" },
  { icon: "💡", text: "أعطني تلميحًا للانطلاق دون كشف الحل الكامل" },
  { icon: "✍️", text: "حل هذا التمرين خطوة بخطوة بالتفصيل" },
  { icon: "🔁", text: "اقترح لي تمرينًا مشابهًا للتدريب" },
];

const PUTER_SRC = "https://js.puter.com/v2/";

/** النماذج تكتب أحيانًا \(..\) و \[..\] — نحولها إلى $..$ و $$..$$ ليفهمها KaTeX */
function normalizeAiMath(src: string): string {
  return src
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => "\n$$\n" + body + "\n$$\n")
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => "$" + body + "$");
}

/** عرض جواب المساعد: Markdown + LaTeX بنفس محرك الموقع (KaTeX) */
function AiMarkdown({ content }: { content: string }) {
  return (
    <div dir="rtl" className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => <ul className="my-2 ms-5 list-disc" {...props} />,
          ol: (props) => <ol className="my-2 ms-5 list-decimal" {...props} />,
          li: (props) => <li className="my-0.5" {...props} />,
          h1: (props) => <p className="my-2 text-[1.05em] font-bold" {...props} />,
          h2: (props) => <p className="my-2 text-[1.05em] font-bold" {...props} />,
          h3: (props) => <p className="my-2 font-bold" {...props} />,
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

type Props = {
  dark: boolean;
  topicTitle: string;
  problem: ReadingProblem;
  onClose: () => void;
};

export function ReadingChat({ dark, topicTitle, problem, onClose }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-5.6-terra");
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // لوحة ألوان متناسقة مع وضع القراءة (ليلي / نهاري)
  const pal = dark
    ? {
        root: "border-slate-700 bg-[#0e1628] text-slate-100",
        line: "border-slate-700",
        soft: "text-slate-400",
        userBubble: "border border-sky-400/25 bg-sky-500/15",
        composer: "border-slate-700 bg-slate-900/70 focus-within:border-sky-400",
        chip: "border-slate-700 text-slate-300 hover:border-sky-400 hover:text-sky-300",
        send: "bg-sky-500 text-white hover:bg-sky-400",
        select: "border-slate-700 bg-slate-900 text-slate-200",
        avatar: "bg-sky-500/20 text-sky-300",
      }
    : {
        root: "border-slate-200 bg-white text-slate-900",
        line: "border-slate-200",
        soft: "text-slate-500",
        userBubble: "border border-blue-600/15 bg-blue-50",
        composer: "border-slate-300 bg-white focus-within:border-blue-600",
        chip: "border-slate-300 text-slate-600 hover:border-blue-600 hover:text-blue-700",
        send: "bg-blue-600 text-white hover:bg-blue-500",
        select: "border-slate-300 bg-white text-slate-700",
        avatar: "bg-blue-100 text-blue-700",
      };

  // تحميل Puter.js مرة واحدة + استرجاع النموذج المفضل
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rm-chat-model");
      if (saved && MODELS.some((m) => m.id === saved)) setModel(saved);
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
    s.onerror = () =>
      setError("تعذر تحميل مكتبة المساعد — تحقق من اتصال الإنترنت ثم أعد فتح الدردشة");
    document.head.appendChild(s);
  }, []);

  // تمرير تلقائي لآخر رسالة (مثل ChatGPT)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs, streamText, busy]);

  /** تعليمات النظام — تُحدَّث تلقائيًا مع كل تمرين معروض */
  function systemPrompt(): string {
    const parts = [
      "أنت أستاذ رياضيات خبير تساعد الطلبة في التحضير لمسابقات الدكتوراه في الرياضيات.",
      "- أجب بالعربية الواضحة، مع إبقاء المصطلحات العلمية بالفرنسية أو الإنجليزية عند الحاجة.",
      "- اكتب كل الرموز والمعادلات بصيغة LaTeX: $...$ للسطرية و $$...$$ للمعادلات المستقلة. لا تستعمل أبدًا \\(..\\) أو \\[..\\].",
      "- نظّم الإجابة في خطوات مرقمة واضحة، وكن دقيقًا رياضيًا.",
      "- إذا طُلب تلميح فقط، فلا تكشف الحل الكامل.",
      "",
      "الموضوع الحالي: «" + topicTitle + "»",
      "نص التمرين رقم " +
        problem.problemNumber +
        (problem.title ? " (" + problem.title + ")" : "") +
        ":",
      problem.statement,
    ];
    if (problem.remark) parts.push("ملاحظة مرفقة بالتمرين: " + problem.remark);
    return parts.join("\n");
  }

  function changeModel(id: string) {
    setModel(id);
    try {
      localStorage.setItem("rm-chat-model", id);
    } catch {
      // تجاهل
    }
  }

  async function send(quick?: string) {
    const q = (quick ?? input).trim();
    if (!q || busy) return;
    if (!ready || !window.puter) {
      setError("مكتبة المساعد لم تُحمَّل بعد — انتظر لحظات ثم أعد المحاولة");
      return;
    }
    setError(null);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    const userMsg: ChatMsg = {
      role: "user",
      content: q,
      problemNumber: problem.problemNumber,
    };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setBusy(true);
    setStreamText("");
    stopRef.current = false;

    const apiMsgs = [
      { role: "system", content: systemPrompt() },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    let full = "";
    try {
      const resp = await window.puter.ai.chat(apiMsgs, { model, stream: true });
      for await (const part of resp) {
        if (stopRef.current) break;
        const piece = (part && part.text) || "";
        if (piece) {
          full += piece;
          setStreamText(full);
        }
      }
      if (full.trim().length === 0 && !stopRef.current) {
        setError("لم يصل أي رد — جرّب نموذجًا آخر من القائمة أو أعد المحاولة");
      }
    } catch (err: any) {
      const raw =
        (err && (err.message || (err.error && err.error.message))) || "";
      setError(
        "تعذر الاتصال بالنموذج" +
          (typeof raw === "string" && raw ? ": " + raw : "") +
          " — جرّب نموذجًا آخر أو أعد المحاولة",
      );
    }
    if (full.trim().length > 0) {
      setMsgs((cur) => [
        ...cur,
        {
          role: "assistant",
          content: full,
          model,
          problemNumber: problem.problemNumber,
        },
      ]);
    }
    setStreamText("");
    setBusy(false);
  }

  return (
    <div
      dir="rtl"
      className={"flex h-full w-full flex-col border-e shadow-2xl " + pal.root}
    >
      {/* ===== رأس الدردشة ===== */}
      <header className={"flex items-center gap-2 border-b px-3 py-2 " + pal.line}>
        <div
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm " +
            pal.avatar
          }
        >
          ✨
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">مساعد الرياضيات</p>
          <p className={"truncate text-[10px] " + pal.soft}>
            يجيب وفق التمرين {problem.problemNumber} المعروض حاليًا
          </p>
        </div>
        <select
          value={model}
          onChange={(e) => changeModel(e.target.value)}
          title="اختيار النموذج"
          className={
            "max-w-40 cursor-pointer rounded-lg border px-1.5 py-1 text-[10px] outline-none " +
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
          title="محادثة جديدة"
          onClick={() => {
            setMsgs([]);
            setError(null);
          }}
          className={
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] transition " +
            pal.chip
          }
        >
          🗑️
        </button>
        <button
          type="button"
          title="إغلاق الدردشة"
          onClick={onClose}
          className={
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] transition hover:!border-red-500 hover:!text-red-500 " +
            pal.chip
          }
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
                "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-sm " +
                pal.avatar
              }
            >
              ✨
            </div>
            <div>
              <p className="text-sm font-bold">كيف أساعدك في هذا التمرين؟</p>
              <p className={"mt-1 text-[11px] leading-5 " + pal.soft}>
                أعرف نص التمرين المعروض أمامك — اسأل مباشرة.
                <br />
                عند أول رسالة قد تظهر نافذة تسجيل دخول Puter المجانية (مرة
                واحدة فقط).
              </p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              {QUICK_PROMPTS.map((qp) => (
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
                <div key={i} className="flex justify-start">
                  <div
                    className={
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md px-3.5 py-2 text-[13px] leading-6 " +
                      pal.userBubble
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2">
                  <div
                    className={
                      "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] " +
                      pal.avatar
                    }
                  >
                    ✨
                  </div>
                  <div className="min-w-0 flex-1 text-[13px] leading-7">
                    <AiMarkdown content={m.content} />
                    {m.model && (
                      <p className={"mt-1 text-[9px] " + pal.soft} dir="ltr">
                        {m.model}
                        {m.problemNumber != null
                          ? " · Ex " + m.problemNumber
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )}

            {/* الرسالة قيد التوليد — بث مباشر */}
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
                    <div dir="auto" className="whitespace-pre-wrap break-words">
                      {streamText}
                      <span className="animate-pulse">▍</span>
                    </div>
                  ) : (
                    <p className={"text-[11px] " + pal.soft}>
                      {model.includes("-pro")
                        ? "يفكر بعمق في المسألة… قد يستغرق حتى دقيقة ⏳"
                        : "جارٍ الكتابة…"}
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

      {/* ===== حقل الإدخال — بأسلوب ChatGPT ===== */}
      <footer className={"border-t p-2.5 " + pal.line}>
        <div
          className={
            "flex items-end gap-2 rounded-2xl border px-3 py-2 transition " +
            pal.composer
          }
        >
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            disabled={busy}
            placeholder="اسأل عن التمرين المعروض…"
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
              title="إيقاف التوليد"
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
              title="إرسال (Enter)"
              onClick={() => send()}
              disabled={!input.trim() || !ready}
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition disabled:opacity-40 " +
                pal.send
              }
            >
              ↑
            </button>
          )}
        </div>
        <p className={"mt-1.5 text-center text-[9px] " + pal.soft}>
          مجاني عبر Puter · Enter للإرسال · Shift+Enter لسطر جديد · قد يخطئ
          المساعد، تحقق من الخطوات بنفسك
        </p>
      </footer>
    </div>
  );
}
