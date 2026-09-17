"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "mathora-orb-chat-v3";
const OLD_KEY = "mathora-orb-chat-v2";
const LEGACY_KEY = "mathora-orb-chat-v1";
const DRAFT_KEY = "mathora-orb-draft-v2";
const SUPPORT_EVENT = "docmath-support-notice";
const SITE = "https://www.docmathdz.dev";
const BRAND = "Mathora";
const MAX_MESSAGES = 36;
const MAX_INPUT = 3000;

type Role = "user" | "assistant";
type Feedback = "up" | "down";
type Msg = { id: string; role: Role; content: string; at: string; feedback?: Feedback };
type Status = { name: string; limit: number; remaining: number; resetAt: string };
type StoredMsg = Partial<Msg> & { role?: unknown; content?: unknown; createdAt?: unknown };

const ACTIONS = [
  { title: "خطة مراجعة", prompt: "اصنع لي خطة مراجعة أسبوعية للتحضير لدكتوراه الرياضيات" },
  { title: "مواضيع مشابهة", prompt: "اقترح لي مواضيع مشابهة في التحليل الدالي مع روابط مباشرة" },
  { title: "بحث سريع", prompt: "ابحث عن امتحانات جامعة عنابة في الرياضيات" },
  { title: "تقييم مستواي", prompt: "اسألني أسئلة قصيرة لتعرف نقاط ضعفي في التحضير للدكتوراه" },
  { title: "اختبار قصير", prompt: "أنشئ لي اختبارًا قصيرًا من 5 أسئلة للتحضير لمسابقة الدكتوراه في الرياضيات" },
  { title: "مقارنة مواضيع", prompt: "قارن بين مواضيع السنوات الأخيرة واقترح من أين أبدأ المراجعة" },
  { title: "كلمات بحث", prompt: "اقترح كلمات بحث دقيقة للعثور على مواضيع في الجبر والتحليل والاحتمالات" },
  { title: "خارطة تعلم", prompt: "اصنع خارطة تعلم مرتبة للمواد الأكثر تكرارًا في مسابقات الدكتوراه" },
];

function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }
}

function normalize(raw: unknown): Msg[] {
  if (!Array.isArray(raw)) return [];
  return (raw as StoredMsg[])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      id: typeof m.id === "string" ? m.id : id(),
      role: m.role as Role,
      content: String(m.content).slice(0, 5000),
      at: typeof m.at === "string" ? m.at : typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
      feedback: m.feedback === "up" || m.feedback === "down" ? m.feedback : undefined,
    }))
    .slice(-MAX_MESSAGES);
}

function loadMessages() {
  try {
    const raw = safeGet(STORAGE_KEY) ?? safeGet(OLD_KEY) ?? safeGet(LEGACY_KEY);
    const messages = raw ? normalize(JSON.parse(raw)) : [];
    if (messages.length) safeSet(STORAGE_KEY, JSON.stringify(messages));
    return messages;
  } catch {
    return [];
  }
}

function saveMessages(messages: Msg[]) {
  safeSet(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
}

function toHref(url: string) {
  if (url.startsWith(SITE)) return url.replace(SITE, "") || "/";
  return url;
}

function timeLeft(resetAt: string) {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "قريبًا";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  return h ? `${h}س ${m}د` : `${m}د`;
}

function renderLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(https?:\/\/[^\s)\]<]+)|(?<![\w/])(\/(?:topics|search|universities|guide|coffee|revision|contribute|library|lectures|theses|mathora)[^\s)\]<]*)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const href = toHref(match[2] || match[3] || match[4] || "");
    const external = href.startsWith("http");
    parts.push(
      <a key={key++} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="font-semibold text-[#59677f] underline decoration-[#c7ceda] underline-offset-2 transition hover:text-[#2f3440] dark:text-[#b8c7e5] dark:hover:text-white">
        {match[1] || "فتح الرابط"}
      </a>,
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function OrbLogo({ size = 44, active = false }: { size?: number; active?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white via-zinc-100 to-zinc-300 shadow-inner ring-1 ring-black/10 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-950 dark:ring-white/15" style={{ width: size, height: size }}>
      <Image src="/logo-light.png" alt="" width={size} height={size} className="h-full w-full object-cover dark:hidden" />
      <Image src="/logo-dark.png" alt="" width={size} height={size} className="hidden h-full w-full object-cover dark:block" />
      <span className="pointer-events-none absolute left-[27%] top-[37%] h-1.5 w-1.5 animate-[mathora-blink_5.5s_infinite] rounded-full bg-zinc-900 dark:bg-white" />
      <span className="pointer-events-none absolute right-[27%] top-[37%] h-1.5 w-1.5 animate-[mathora-blink_5.5s_infinite] rounded-full bg-zinc-900 dark:bg-white" />
      <span className="pointer-events-none absolute bottom-[22%] h-[2px] w-3 rounded-full bg-zinc-800/60 dark:bg-white/70" />
      {active && <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />}
    </span>
  );
}

export function MathoraAiOrb() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const topicSlug = useMemo(() => {
    const match = pathname?.match(/^\/topics\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const exhausted = !!status && status.remaining <= 0;
  const firstName = status?.name?.trim().split(/\s+/)[0] || "";
  const hasChat = messages.length > 0 || !!stream;

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant", { cache: "no-store" });
      if (res.status === 401) return setSignedIn(false);
      if (!res.ok) return;
      setSignedIn(true);
      setStatus((await res.json()) as Status);
    } catch {}
  }, []);

  useEffect(() => {
    setMessages(loadMessages());
    setInput(safeGet(DRAFT_KEY) ?? "");
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveMessages(messages);
  }, [messages, ready]);

  useEffect(() => {
    if (ready) safeSet(DRAFT_KEY, input.slice(0, MAX_INPUT));
  }, [input, ready]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, stream, open]);

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("keydown", keyHandler);
      abortRef.current?.abort();
      recognitionRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    loadStatus();
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    const statusTimer = window.setInterval(loadStatus, 60_000);
    return () => {
      window.clearTimeout(focusTimer);
      window.clearInterval(statusTimer);
    };
  }, [open, loadStatus]);

  function setInputSmart(value: string) {
    setInput(value.slice(0, MAX_INPUT));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    });
  }

  function clearChat() {
    abortRef.current?.abort();
    recognitionRef.current?.stop?.();
    liveRef.current = "";
    setMessages([]);
    setInputSmart("");
    setStream("");
    setError(null);
    setBusy(false);
    setListening(false);
    try {
      [STORAGE_KEY, OLD_KEY, LEGACY_KEY, DRAFT_KEY].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
    } catch {}
  }

  function stopGenerating() {
    abortRef.current?.abort();
    const partial = liveRef.current.trim();
    if (partial) setMessages((cur) => [...cur, { id: id(), role: "assistant", content: `${partial}\n\n— تم إيقاف التوليد.`, at: new Date().toISOString() }]);
    liveRef.current = "";
    setStream("");
    setBusy(false);
  }

  async function copy(text: string, marker: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(marker);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setError("تعذّر النسخ من المتصفح.");
    }
  }

  function transcript() {
    return messages.map((m) => `${m.role === "user" ? "أنت" : BRAND}: ${m.content}`).join("\n\n---\n\n");
  }

  function rate(message: Msg, feedback: Feedback) {
    setMessages((cur) => cur.map((m) => (m.id === message.id ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m)));
  }

  function toggleVoice() {
    const w = window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return setError("متصفحك لا يدعم الإملاء الصوتي حاليًا.");
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-DZ";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const text = Array.from(event.results).map((result: any) => result?.[0]?.transcript ?? "").join(" ").trim();
      if (text) setInputSmart(text);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("تعذّر تشغيل الإملاء الصوتي.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setError(null);
    recognition.start();
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (!online) return setError("أنت غير متصل بالإنترنت حاليًا.");
    if (exhausted) return;

    abortRef.current?.abort();
    recognitionRef.current?.stop?.();
    const controller = new AbortController();
    abortRef.current = controller;
    liveRef.current = "";

    const userMsg: Msg = { id: id(), role: "user", content: text, at: new Date().toISOString() };
    const next = [...messages, userMsg].slice(-MAX_MESSAGES);
    setMessages(next);
    setInputSmart("");
    setBusy(true);
    setError(null);
    setLastPrompt(text);
    setStream("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: next
            .map(({ role, content }, index, arr) => ({
              role,
              content: role === "user" && index === arr.length - 1 && topicSlug ? `${content}\n\nالسياق الحالي: المستخدم في صفحة الموضوع /topics/${topicSlug}. إذا كان السؤال عن "هذا الموضوع" أو "هذه الصفحة" فاستعمل هذا الرابط وهذا الـ slug في البحث.` : content,
            }))
            .slice(-10),
          context: { path: pathname, topicSlug },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) return setSignedIn(false);
        if (data?.code === "limit_messages") {
          setStatus((s) => (s ? { ...s, remaining: 0, resetAt: data.resetAt ?? s.resetAt } : s));
          window.dispatchEvent(new CustomEvent(SUPPORT_EVENT));
          return;
        }
        throw new Error(data?.error || "request_failed");
      }

      const remaining = Number(res.headers.get("X-AI-Remaining"));
      const resetAt = res.headers.get("X-AI-Reset");
      if (Number.isFinite(remaining) && resetAt) setStatus((s) => (s ? { ...s, remaining, resetAt } : s));

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        liveRef.current += decoder.decode(value, { stream: true });
        setStream(liveRef.current);
      }

      const full = liveRef.current.trim();
      if (!full) return setError("لم يصل رد من المساعد. حاول مرة أخرى.");
      setMessages((cur) => [...cur, { id: id(), role: "assistant", content: full, at: new Date().toISOString() }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("تعذّر الاتصال بالمساعد. يمكنك إعادة المحاولة الآن.");
    } finally {
      abortRef.current = null;
      liveRef.current = "";
      setStream("");
      setBusy(false);
      loadStatus();
    }
  }

  if (pathname?.startsWith("/mathora")) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes mathora-orb-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-5px) scale(1.015); } }
        @keyframes mathora-blink { 0%, 91%, 100% { transform: scaleY(1); opacity: 1; } 94%, 97% { transform: scaleY(0.08); opacity: 0.8; } }
        @keyframes mathora-ring { 0% { transform: scale(0.86); opacity: 0.55; } 70%, 100% { transform: scale(1.35); opacity: 0; } }
      `}</style>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] sm:bg-transparent" onClick={() => setOpen(false)}>
          <section dir="rtl" aria-label="Mathora AI" onClick={(event) => event.stopPropagation()} className="fixed inset-x-3 bottom-3 top-14 flex flex-col overflow-hidden rounded-[1.7rem] border border-black/10 bg-[#fbfbfa] shadow-[0_24px_80px_rgba(15,15,15,0.25)] dark:border-white/10 dark:bg-[#191919] sm:inset-auto sm:bottom-24 sm:left-5 sm:h-[680px] sm:max-h-[calc(100vh-7rem)] sm:w-[440px]">
            <div className="flex items-center gap-3 border-b border-[#e8e8e5] bg-white/85 px-4 py-3 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#202020]/85">
              <OrbLogo size={38} active={busy} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="text-sm font-bold tracking-tight text-[#37352f] dark:text-[#f4f4f5]">{BRAND} AI</p><span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-zinc-900">Pro</span></div>
                <p className="truncate text-[11px] text-[#787774] dark:text-[#9b9b9b]">{topicSlug ? "يفهم الصفحة الحالية ويبحث في أرشيف المواضيع" : "مساعد بحث ومراجعة مبني على مواضيع DocMath DZ"}</p>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`} title={online ? "متصل" : "غير متصل"} />
              {status && !exhausted && <span className="rounded-full border border-[#e3e2e0] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#787774] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#b0b0b0]">{status.remaining}/{status.limit}</span>}
              <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#787774] transition hover:bg-[#f1f1ef] hover:text-[#37352f] dark:hover:bg-[#2a2a2a] dark:hover:text-white" aria-label="تصغير">✕</button>
            </div>

            {signedIn === false ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><OrbLogo size={58} /><p className="font-semibold text-[#37352f] dark:text-[#f4f4f5]">Mathora AI للأعضاء فقط</p><p className="max-w-xs text-sm leading-7 text-[#787774] dark:text-[#9b9b9b]">سجّل الدخول لتستعمل المساعد في البحث داخل مواضيع الدكتوراه والحصول على اقتراحات مخصصة.</p><Link href="/signin" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">تسجيل الدخول</Link></div>
            ) : (
              <>
                <div className="border-b border-[#e8e8e5] bg-[#f7f7f5]/70 px-4 py-2 dark:border-[#2f2f2f] dark:bg-[#202020]/45">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                    <button type="button" onClick={clearChat} className="shrink-0 rounded-full border border-[#e3e2e0] bg-white px-3 py-1 text-[11px] font-semibold text-[#787774] transition hover:bg-[#f1f1ef] dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:bg-[#2a2a2a]">محادثة جديدة</button>
                    {lastPrompt && !busy && <button type="button" onClick={() => send(lastPrompt)} className="shrink-0 rounded-full border border-[#e3e2e0] bg-white px-3 py-1 text-[11px] font-semibold text-[#787774] transition hover:bg-[#f1f1ef] dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:bg-[#2a2a2a]">إعادة المحاولة</button>}
                    {messages.length > 0 && <button type="button" onClick={() => copy(transcript(), "transcript")} className="shrink-0 rounded-full border border-[#e3e2e0] bg-white px-3 py-1 text-[11px] font-semibold text-[#787774] transition hover:bg-[#f1f1ef] dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:bg-[#2a2a2a]">{copied === "transcript" ? "تم النسخ" : "نسخ المحادثة"}</button>}
                    {topicSlug && <button type="button" onClick={() => send("اشرح لي هذا الموضوع واقترح مواضيع مشابهة له")} className="shrink-0 rounded-full border border-[#e3e2e0] bg-white px-3 py-1 text-[11px] font-semibold text-[#787774] transition hover:bg-[#f1f1ef] dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:bg-[#2a2a2a]">افهم هذه الصفحة</button>}
                  </div>
                </div>

                <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                  {!hasChat && (
                    <div className="pt-5 text-center">
                      <div className="mb-3 flex justify-center"><OrbLogo size={58} /></div>
                      <p className="text-[16px] font-bold text-[#37352f] dark:text-[#f4f4f5]">{firstName ? `مرحبًا ${firstName}` : "مرحبًا بك"} 👋</p>
                      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-7 text-[#787774] dark:text-[#9b9b9b]">اسألني عن جامعة، سنة، تخصص، تمرين، مقارنة، اختبار قصير، أو خطة مراجعة. سأعطيك إجابة مركزة وروابط مباشرة من DocMath DZ.</p>
                      <div className="mt-4 grid gap-2 text-right sm:grid-cols-2">{ACTIONS.map((a) => <button key={a.title} type="button" onClick={() => send(a.prompt)} className="rounded-2xl border border-[#e3e2e0] bg-white px-3.5 py-2.5 text-[12.5px] text-[#37352f] shadow-sm transition hover:-translate-y-0.5 hover:border-[#c7c7cc] hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ececec] dark:hover:border-[#555]"><span className="block font-bold">{a.title}</span><span className="mt-0.5 block text-[11px] text-[#787774] dark:text-[#9b9b9b]">{a.prompt}</span></button>)}</div>
                    </div>
                  )}

                  {messages.map((m) => m.role === "user" ? (
                    <div key={m.id} className="flex justify-start"><div dir="auto" className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#37352f] px-3.5 py-2 text-[13px] leading-6 text-white dark:bg-[#e8e8e8] dark:text-[#191919]">{m.content}</div></div>
                  ) : (
                    <div key={m.id} className="group flex gap-2.5 text-right"><OrbLogo size={24} /><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><p className="text-[11px] font-semibold text-[#9b9a97] dark:text-[#787878]">{BRAND}</p><div className="flex opacity-0 transition group-hover:opacity-100"><button type="button" onClick={() => copy(m.content, m.id)} className="rounded px-1 text-[10px] text-[#9b9a97] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a]">{copied === m.id ? "تم النسخ" : "نسخ"}</button><button type="button" onClick={() => rate(m, "up")} className={`rounded px-1 text-[10px] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] ${m.feedback === "up" ? "text-emerald-600" : "text-[#9b9a97]"}`}>👍</button><button type="button" onClick={() => rate(m, "down")} className={`rounded px-1 text-[10px] hover:bg-[#f1f1ef] dark:hover:bg-[#2a2a2a] ${m.feedback === "down" ? "text-red-600" : "text-[#9b9a97]"}`}>👎</button></div></div><div dir="auto" className="whitespace-pre-wrap text-[13px] leading-7 text-[#37352f] dark:text-[#e8e8e8]">{renderLinks(m.content)}</div></div></div>
                  ))}

                  {stream && <div className="flex gap-2.5 text-right"><OrbLogo size={24} active /><div className="min-w-0 flex-1"><p className="mb-1 text-[11px] font-semibold text-[#9b9a97] dark:text-[#787878]">{BRAND}</p><div dir="auto" className="whitespace-pre-wrap text-[13px] leading-7 text-[#37352f] dark:text-[#e8e8e8]">{renderLinks(stream)}<span className="ms-1 inline-block h-3 w-[2px] animate-pulse bg-[#a1a1aa] align-middle" /></div></div></div>}
                  {busy && !stream && <div className="flex items-center gap-2 text-[13px] text-[#9b9a97]"><OrbLogo size={24} active /><span className="animate-pulse">يبحث في أرشيف المواضيع…</span></div>}
                  {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-[12px] font-medium text-red-600 dark:text-red-400">⚠️ {error}</div>}
                  {exhausted && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">⏳ يتجدد رصيدك بعد {timeLeft(status.resetAt)}</div>}
                </div>

                <div className="border-t border-[#e8e8e5] bg-white/85 p-3 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#202020]/85">
                  <div className="rounded-2xl border border-[#deded9] bg-white shadow-sm focus-within:border-[#b9b9b1] dark:border-[#3a3a3a] dark:bg-[#191919] dark:focus-within:border-[#5a5a5a]">
                    <textarea ref={inputRef} value={input} rows={1} disabled={busy || exhausted} onChange={(event) => setInputSmart(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} dir="auto" placeholder={exhausted ? "عد لاحقًا بعد تجدد الرصيد" : "اكتب رسالتك إلى Mathora AI..."} className="max-h-[132px] min-h-12 w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-6 outline-none placeholder:text-[#9b9a97] disabled:opacity-50 dark:text-[#f4f4f5]" />
                    <div className="flex items-center gap-2 px-2.5 pb-2.5">
                      <Link href="/mathora" className="rounded-full px-2 py-1 text-[11px] font-medium text-[#787774] transition hover:bg-[#f1f1ef] dark:text-[#9b9b9b] dark:hover:bg-[#2a2a2a]">فتح كامل</Link>
                      <button type="button" onClick={toggleVoice} disabled={busy || exhausted} className={`rounded-full px-2 py-1 text-[11px] font-medium transition hover:bg-[#f1f1ef] disabled:opacity-40 dark:hover:bg-[#2a2a2a] ${listening ? "text-red-600" : "text-[#787774] dark:text-[#9b9b9b]"}`}>{listening ? "إيقاف الصوت" : "صوت"}</button>
                      <span className="flex-1 text-[10.5px] text-[#9b9a97] dark:text-[#787878]">{busy ? "يتم التوليد الآن" : listening ? "أستمع الآن…" : input.trim() ? `${input.trim().length}/${MAX_INPUT}` : "Enter للإرسال · Ctrl+K للفتح"}</span>
                      {busy ? <button type="button" onClick={stopGenerating} className="rounded-full border border-[#e3e2e0] px-4 py-1.5 text-[12px] font-bold text-[#37352f] transition hover:bg-[#f1f1ef] dark:border-[#3a3a3a] dark:text-[#f4f4f5] dark:hover:bg-[#2a2a2a]">إيقاف</button> : <button type="button" onClick={() => send()} disabled={exhausted || !input.trim()} className="rounded-full bg-[#37352f] px-4 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#111] disabled:opacity-40 dark:bg-white dark:text-[#191919] dark:hover:bg-zinc-200">إرسال</button>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <button type="button" onClick={() => setOpen(true)} aria-label="افتح Mathora AI" className="fixed bottom-4 left-4 z-40 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white/90 shadow-[0_12px_40px_rgba(15,15,15,0.22)] ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:shadow-[0_18px_56px_rgba(15,15,15,0.28)] focus:outline-none focus:ring-4 focus:ring-zinc-400/30 dark:bg-[#202020]/90 dark:ring-white/15 sm:bottom-5 sm:left-5" style={{ animation: "mathora-orb-float 4.2s ease-in-out infinite" }}>
        <span className="absolute inset-0 rounded-full bg-zinc-400/30 dark:bg-white/15" style={{ animation: "mathora-ring 2.8s ease-out infinite" }} />
        <OrbLogo size={50} active={busy} />
        {!hasChat && <span className="absolute -right-1 -top-1 rounded-full bg-[#37352f] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm dark:bg-white dark:text-[#191919]">AI</span>}
        {hasChat && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-[#202020]" />}
      </button>
    </>
  );
}