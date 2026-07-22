"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Mathora full page — chat persists in sessionStorage while browsing exams
// Cleared only on explicit Exit (خروج نهائي)

type Msg = { role: "user" | "assistant"; content: string };
type Status = {
  name: string;
  limit: number;
  remaining: number;
  resetAt: string;
};

export const SUPPORT_EVENT = "docmath-support-notice";
const BRAND = "Mathora";
const SITE_HOST = "https://www.docmathdz.dev";
const STORAGE_KEY = "mathora-chat-v1";

function timeLeft(resetAt: string): string {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function toHref(url: string): string {
  if (url.startsWith(SITE_HOST)) return url.replace(SITE_HOST, "") || "/";
  if (url.startsWith("/")) return url;
  return url;
}

function loadMsgs(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Msg[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim(),
      )
      .slice(-40);
  } catch {
    return [];
  }
}

function saveMsgs(msgs: Msg[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-40)));
  } catch {
    // ignore
  }
}

export function clearMathoraChat() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function renderContent(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re =
    /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(https?:\/\/[^\s)\]<]+)|(?<![\w/])(\/(?:topics|search|universities|guide|coffee|revision|contribute)[^\s)\]<]*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const examCards: Array<{ label: string; href: string }> = [];

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const mdLabel = match[1];
    const mdUrl = match[2];
    const bareAbs = match[3];
    const bareRel = match[4];
    const url = mdUrl || bareAbs || bareRel || "";
    const href = toHref(url);
    const isExam = href.startsWith("/topics/") || href.includes("/topics/");
    const label =
      mdLabel ||
      (isExam
        ? "فتح الامتحان"
        : href.startsWith("/search")
          ? "تصفّح البحث"
          : href.startsWith("/universities/")
            ? "صفحة الجامعة"
            : "فتح الرابط");

    if (isExam) {
      examCards.push({ label, href });
      out.push(
        <span key={key++} className="sr-only">
          {label}
        </span>,
      );
    } else {
      const external = href.startsWith("http");
      out.push(
        <a
          key={key++}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="break-all font-medium text-[#5b6b8c] underline decoration-[#c0c8d8] underline-offset-2 hover:text-[#374151] dark:text-[#a8b8d8] dark:hover:text-white"
        >
          {label}
        </a>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));

  if (examCards.length > 0) {
    out.push(
      <div key={`cards-${key++}`} className="mt-3 space-y-2">
        {examCards.map((c, i) => (
          <Link
            key={`${c.href}-${i}`}
            href={c.href}
            className="group flex items-start gap-3 rounded-xl border border-[#e3e2e0] bg-white px-3.5 py-3 text-start shadow-sm transition hover:border-[#c5c5c8] hover:shadow-md dark:border-[#3a3a3a] dark:bg-[#202020] dark:hover:border-[#555]"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] text-sm dark:from-[#3f3f46] dark:to-[#27272a]">
              📄
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold leading-6 text-[#37352f] group-hover:text-[#111] dark:text-[#e8e8e8]">
                {c.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-[#9b9a97] dark:text-[#787878]">
                افتح الموضوع · زر الرجوع يعيدك إلى المحادثة كما هي
              </span>
            </span>
            <span className="mt-1 text-[#a1a1aa]">‹</span>
          </Link>
        ))}
      </div>,
    );
  }
  return out;
}

function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10 shadow-[0_1px_4px_rgba(0,0,0,0.12)] dark:ring-white/15"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(145deg, #f5f5f5 0%, #d4d4d4 45%, #a3a3a3 100%)",
      }}
    >
      <Image
        src="/logo-light.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover dark:hidden"
        priority={false}
      />
      <Image
        src="/logo-dark.png"
        alt=""
        width={size}
        height={size}
        className="hidden h-full w-full object-cover dark:block"
        priority={false}
      />
    </span>
  );
}

const SUGGESTIONS = [
  "امتحانات جامعة عنابة",
  "امتحانات البليدة 2024",
  "مواضيع التحليل الدالي",
  "كيف أستعد لمسابقة الدكتوراه؟",
];

export function MathoraPageClient() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMsgs(loadMsgs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveMsgs(msgs);
  }, [msgs, hydrated]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/assistant", { cache: "no-store" });
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as Status;
      setSignedIn(true);
      setStatus(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStatus();
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [loadStatus]);

  useEffect(() => {
    if (!status || status.remaining > 0) return;
    const id = setInterval(() => {
      setTick((v) => v + 1);
      if (new Date(status.resetAt).getTime() <= Date.now()) loadStatus();
    }, 30_000);
    return () => clearInterval(id);
  }, [status, loadStatus]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, streamText, hydrated]);

  function exitForever() {
    clearMathoraChat();
    setMsgs([]);
    setStreamText("");
    setError(null);
    setInput("");
    router.push("/");
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    if (status && status.remaining <= 0) return;
    const history: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(history);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setBusy(true);
    setError(null);
    setStreamText("");
    let full = "";
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) {
          setSignedIn(false);
          return;
        }
        if (data?.code === "limit_messages") {
          setStatus((s) =>
            s ? { ...s, remaining: 0, resetAt: data.resetAt ?? s.resetAt } : s,
          );
          window.dispatchEvent(new CustomEvent(SUPPORT_EVENT));
          return;
        }
        throw new Error(data?.error || "Request failed");
      }
      const remaining = Number(res.headers.get("X-AI-Remaining"));
      const resetAt = res.headers.get("X-AI-Reset");
      if (Number.isFinite(remaining) && resetAt) {
        setStatus((s) => (s ? { ...s, remaining, resetAt } : s));
        if (remaining <= 0) {
          window.dispatchEvent(new CustomEvent(SUPPORT_EVENT));
        }
      }
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setStreamText(full);
        }
      }
      if (full.trim()) {
        setMsgs((cur) => [...cur, { role: "assistant", content: full }]);
      } else {
        setError("No reply — try again");
      }
    } catch {
      setError("Connection error — try again");
    } finally {
      setStreamText("");
      setBusy(false);
    }
  }

  const exhausted = !!status && status.remaining <= 0;
  const firstName = status?.name?.trim().split(/\s+/)[0] || "";

  return (
    <div
      dir="ltr"
      className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col bg-[#fbfbfa] dark:bg-[#191919]"
    >
      <div className="sticky top-12 z-30 flex items-center gap-2.5 border-b border-[#e9e9e7] bg-[#fbfbfa]/95 px-3 py-2.5 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#191919]/95 sm:px-4">
        <button
          type="button"
          onClick={() => router.back()}
          title="رجوع — المحادثة تبقى محفوظة"
          aria-label="رجوع"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#52525b] transition hover:bg-[#f1f1ef] dark:text-[#a1a1aa] dark:hover:bg-[#2a2a2a]"
        >
          ←
        </button>
        <BrandMark size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-[#37352f] dark:text-[#e8e8e8]">
              {BRAND}
            </span>
            <span className="rounded-full bg-gradient-to-r from-[#e5e5e5] to-[#cfcfcf] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-[#52525b] dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#a1a1aa]">
              AI
            </span>
          </div>
          <p
            className="truncate text-[11px] text-[#9b9a97] dark:text-[#787878]"
            dir="rtl"
          >
            مساعدك الأكاديمي للوصول المباشر إلى مواضيع مسابقات الدكتوراه
          </p>
        </div>
        {status && !exhausted && (
          <span className="rounded-full border border-[#e3e2e0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#787774] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#9b9b9b]">
            {status.remaining}/{status.limit}
          </span>
        )}
        {status && exhausted && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/25 dark:text-amber-200">
            ⏳ {timeLeft(status.resetAt)}
          </span>
        )}
        <button
          type="button"
          onClick={exitForever}
          title="إنهاء الجلسة — تُحذف المحادثة نهائيًا"
          className="rounded-full border border-[#e3e2e0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#52525b] transition hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#d4d4d8] dark:hover:bg-[#2a2a2a]"
        >
          خروج
        </button>
      </div>

      {signedIn === false ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <BrandMark size={56} />
          <p className="text-base font-semibold text-[#37352f] dark:text-[#e8e8e8]">
            {BRAND} للأعضاء فقط
          </p>
          <p
            className="max-w-sm text-[13px] text-[#787774] dark:text-[#9b9b9b]"
            dir="rtl"
          >
            سجّل الدخول للاستفادة من البحث الذكي والوصول المباشر إلى مواضيع المسابقات.
          </p>
          <Link
            href="/signin"
            className="rounded-full bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-5 py-2 text-sm font-semibold text-[#3f3f46] shadow-sm ring-1 ring-black/10 dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#f4f4f5] dark:ring-white/10"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5"
          >
            {hydrated && msgs.length === 0 && !streamText && (
              <div className="mx-auto max-w-lg pt-6 text-center sm:pt-10">
                <div className="mx-auto mb-3 flex justify-center">
                  <BrandMark size={52} />
                </div>
                <p className="text-[17px] font-semibold tracking-tight text-[#37352f] dark:text-[#e8e8e8]">
                  {firstName ? `Hi ${firstName}` : "Hi there"} 👋
                </p>
                <p
                  className="mt-2 text-[13.5px] leading-7 text-[#787774] dark:text-[#9b9b9b]"
                  dir="rtl"
                >
                  أنا {BRAND}، مساعدك الأكاديمي في DocMath DZ. اطلب مواضيع
                  جامعة أو سنة أو تخصص، وسأعرضها لك كبطاقات بروابط مباشرة.
                  عند فتح أي موضوع يمكنك العودة بزر الرجوع والمحادثة
                  <b>تبقى محفوظة</b> — ولا تُحذف إلا عند اختيار «خروج».
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-[#e3e2e0] bg-white px-3 py-1.5 text-[12px] text-[#37352f] transition hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#e8e8e8] dark:hover:bg-[#2a2a2a]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    dir="auto"
                    className="max-w-[92%] whitespace-pre-wrap rounded-2xl bg-[#f1f1ef] px-3.5 py-2 text-[13.5px] leading-6 text-[#37352f] dark:bg-[#2a2a2a] dark:text-[#ececec] sm:max-w-[80%]"
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <BrandMark size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11.5px] font-medium text-[#9b9a97] dark:text-[#787878]">
                      {BRAND}
                    </p>
                    <div
                      dir="auto"
                      className="whitespace-pre-wrap text-[13.5px] leading-7 text-[#37352f] dark:text-[#e8e8e8]"
                    >
                      {renderContent(m.content)}
                    </div>
                  </div>
                </div>
              ),
            )}

            {streamText && (
              <div className="flex gap-2.5">
                <BrandMark size={24} />
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11.5px] font-medium text-[#9b9a97] dark:text-[#787878]">
                    {BRAND}
                  </p>
                  <div
                    dir="auto"
                    className="whitespace-pre-wrap text-[13.5px] leading-7 text-[#37352f] dark:text-[#e8e8e8]"
                  >
                    {renderContent(streamText)}
                    <span className="ms-0.5 inline-block h-[13px] w-[2px] animate-pulse bg-[#a1a1aa] align-middle" />
                  </div>
                </div>
              </div>
            )}

            {busy && !streamText && (
              <div className="flex items-center gap-2.5 text-[#9b9a97] dark:text-[#787878]">
                <BrandMark size={24} />
                <span className="animate-pulse text-[13px]">Searching exams…</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {exhausted && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 text-center dark:border-amber-800/40 dark:bg-amber-900/20">
                <p className="font-medium text-[#37352f] dark:text-[#e8e8e8]">
                  ⏳ Try again in <b>{status ? timeLeft(status.resetAt) : ""}</b>
                </p>
                <p
                  className="mt-1 text-[12px] text-[#787774] dark:text-[#9b9b9b]"
                  dir="rtl"
                >
                  استنفدت رصيد رسائلك لهذه الفترة. دعمك يساعدنا على توسيع الخدمة.
                </p>
                <Link
                  href="/coffee"
                  className="mt-2.5 inline-block rounded-full bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-4 py-1.5 text-[12.5px] font-semibold text-[#3f3f46] ring-1 ring-black/10 dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#f4f4f5] dark:ring-white/10"
                >
                  ☕ قهوة دكتوراه
                </Link>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 shrink-0 border-t border-[#e9e9e7] bg-[#fbfbfa]/95 px-3 py-3 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#191919]/95 sm:px-4">
            <div className="rounded-2xl border border-[#e3e2e0] bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.03),0_8px_24px_rgba(15,15,15,0.06)] focus-within:border-[#cfcfc8] dark:border-[#3a3a3a] dark:bg-[#202020] dark:focus-within:border-[#555]">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 140) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                dir="auto"
                placeholder={
                  exhausted
                    ? "عد لاحقًا بعد تجدد الرصيد ⏳"
                    : `اسأل ${BRAND} — مثال: امتحانات عنابة 2023`
                }
                disabled={exhausted || busy}
                className="max-h-[140px] min-h-[52px] w-full resize-none bg-transparent px-3.5 pt-3.5 pb-1 text-[14px] leading-5 outline-none placeholder:text-[#9b9a97] disabled:opacity-50 dark:placeholder:text-[#787878]"
              />
              <div className="flex items-center gap-2 px-2.5 pb-2.5">
                <span className="flex-1 text-[11px] text-[#9b9a97] dark:text-[#787878]">
                  {status && !exhausted
                    ? `${status.remaining} messages left · chat saved until Exit`
                    : "Enter to send"}
                </span>
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={exhausted || busy || !input.trim()}
                  className="inline-flex h-8 items-center rounded-full bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-3.5 text-[12.5px] font-semibold text-[#3f3f46] ring-1 ring-black/10 transition hover:from-white hover:to-[#cfcfd4] disabled:opacity-40 dark:from-[#e8e8e8] dark:to-[#cfcfcf] dark:text-[#191919] dark:ring-white/5"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
