"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// DocMath AI — مساعد الشاشة الرئيسية (للأعضاء فقط)
// المحادثة لا تُحفظ أبدًا — تُمسح تلقائيًا عند الإغلاق أو مغادرة الصفحة

type Msg = { role: "user" | "assistant"; content: string };
type Status = {
  name: string;
  limit: number;
  remaining: number;
  resetAt: string;
};

export const SUPPORT_EVENT = "docmath-support-notice";

function timeLeft(resetAt: string): string {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// يحول روابط [نص](رابط) والروابط المباشرة إلى روابط قابلة للنقر
function renderContent(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const label = match[1] ?? "Open link ↗";
    const url = match[2] ?? match[3] ?? "";
    const href = url.startsWith("https://www.docmathdz.dev")
      ? url.replace("https://www.docmathdz.dev", "") || "/"
      : url;
    out.push(
      <a
        key={key++}
        href={href}
        target={href.startsWith("/") ? undefined : "_blank"}
        rel="noreferrer"
        className="font-medium text-[#9065b0] underline underline-offset-2 dark:text-[#b8a4ff]"
      >
        {label}
      </a>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

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
      // نتجاهل — ستظهر الحالة عند أول رسالة
    }
  }, []);

  useEffect(() => {
    if (open) loadStatus();
  }, [open, loadStatus]);

  // عدّاد حي: يحدّث الوقت المتبقي ويعيد التحميل عند فتح النافذة من جديد
  useEffect(() => {
    if (!open || !status || status.remaining > 0) return;
    const id = setInterval(() => {
      setTick((v) => v + 1);
      if (new Date(status.resetAt).getTime() <= Date.now()) loadStatus();
    }, 30_000);
    return () => clearInterval(id);
  }, [open, status, loadStatus]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, streamText, open]);

  // المحادثة لا تُحفظ — تُمسح عند الإغلاق
  function close() {
    setOpen(false);
    setMsgs([]);
    setStreamText("");
    setError(null);
    setInput("");
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (status && status.remaining <= 0) return;
    const history: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(history);
    setInput("");
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

  return (
    <>
      {/* زر عائم في الشاشة الرئيسية */}
      <button
        type="button"
        dir="ltr"
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-[#9065b0] px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#7d549c]"
      >
        ✨ DocMath AI
      </button>

      {open && (
        <div
          dir="ltr"
          className="fixed bottom-20 left-5 z-50 flex h-[500px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white text-[13.5px] text-neutral-800 shadow-2xl dark:border-white/10 dark:bg-[#202024] dark:text-neutral-200"
        >
          {/* الرأس */}
          <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2.5 dark:border-white/10">
            <span className="font-semibold">✨ DocMath AI</span>
            <span className="text-[11px] opacity-50">Search &amp; Suggest</span>
            <span className="flex-1" />
            {status && !exhausted && (
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium opacity-70 dark:bg-white/[0.08]">
                {status.remaining}/{status.limit} left
              </span>
            )}
            {status && exhausted && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                ⏳ {timeLeft(status.resetAt)}
              </span>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="rounded-md px-1.5 py-0.5 opacity-60 hover:bg-black/[0.05] hover:opacity-100 dark:hover:bg-white/[0.08]"
            >
              ✕
            </button>
          </div>

          {/* غير مسجل؟ المساعد للأعضاء فقط */}
          {signedIn === false ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="text-3xl">🔒</div>
              <p className="font-medium">Members only</p>
              <p className="text-[12.5px] opacity-60" dir="rtl">
                سجّل الدخول لتستعمل DocMath AI مجانًا
              </p>
              <Link
                href="/signin"
                className="rounded-full bg-[#9065b0] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#7d549c]"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              {/* الرسائل */}
              <div
                ref={listRef}
                className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
              >
                {msgs.length === 0 && !streamText && (
                  <div className="rounded-xl bg-black/[0.04] px-3 py-2.5 dark:bg-white/[0.06]">
                    <p dir="rtl">
                      أهلًا
                      {status?.name ? ` يا ${status.name.split(" ")[0]}` : ""}!
                      👋 أنا DocMath AI — اطلب مني مثلًا: «امتحانات عنابة 2023»
                      أو «اقترح لي تمارين تحليل» أو «نصائح لاجتياز المسابقة» —
                      وسأبحث لك في الموقع دون عناء 😉
                    </p>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    dir="auto"
                    className={
                      m.role === "user"
                        ? "ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-xl bg-[#9065b0] px-3 py-2 text-white"
                        : "w-fit max-w-[92%] whitespace-pre-wrap rounded-xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]"
                    }
                  >
                    {m.role === "assistant"
                      ? renderContent(m.content)
                      : m.content}
                  </div>
                ))}
                {streamText && (
                  <div
                    dir="auto"
                    className="w-fit max-w-[92%] whitespace-pre-wrap rounded-xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]"
                  >
                    {renderContent(streamText)}
                  </div>
                )}
                {busy && !streamText && (
                  <div className="w-fit rounded-xl bg-black/[0.04] px-3 py-2 opacity-60 dark:bg-white/[0.06]">
                    Thinking…
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* نفدت الرسائل — عدّاد + دعوة الدعم */}
                {exhausted && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-center dark:border-amber-800/50 dark:bg-amber-900/20">
                    <p className="font-medium">
                      ⏳ Try again in{" "}
                      <b>{status ? timeLeft(status.resetAt) : ""}</b>
                    </p>
                    <p className="mt-1 text-[12px] opacity-70" dir="rtl">
                      استعملت كل رسائلك — ادعمنا لنضيف المزيد مستقبلًا!
                    </p>
                    <Link
                      href="/coffee"
                      className="mt-2 inline-block rounded-full bg-amber-500 px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-600"
                    >
                      ☕ قهوة دكتوراه
                    </Link>
                  </div>
                )}
              </div>

              {/* الإدخال */}
              <div className="flex items-center gap-2 border-t border-black/10 px-2.5 py-2 dark:border-white/10">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  dir="auto"
                  placeholder={
                    exhausted ? "Come back later ⏳" : "Ask DocMath AI…"
                  }
                  disabled={exhausted || busy}
                  className="min-w-0 flex-1 rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none placeholder:opacity-50 focus:border-[#9065b0] disabled:opacity-50 dark:border-white/10"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={exhausted || busy || !input.trim()}
                  className="rounded-xl bg-[#9065b0] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#7d549c] disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
