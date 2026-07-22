"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Mathora — مساعد الشاشة الرئيسية (Notion-style · silver · members only)
// المحادثة لا تُحفظ — تُمسح عند الإغلاق أو مغادرة الصفحة

type Msg = { role: "user" | "assistant"; content: string };
type Status = {
  name: string;
  limit: number;
  remaining: number;
  resetAt: string;
};

export const SUPPORT_EVENT = "docmath-support-notice";
const BRAND = "Mathora";

function timeLeft(resetAt: string): string {
  const ms = new Date(resetAt).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

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
        className="font-medium text-[#6b7280] underline decoration-[#c0c0c0] underline-offset-2 hover:text-[#374151] dark:text-[#d1d5db] dark:hover:text-white"
      >
        {label}
      </a>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (open) {
      loadStatus();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, loadStatus]);

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
    <>
      {/* زر عائم — أسفل يمين · فضي · شعار دائري */}
      <button
        type="button"
        dir="ltr"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? `Close ${BRAND}` : `Open ${BRAND}`}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full border border-black/10 bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-3.5 py-2 text-[13px] font-semibold text-[#3f3f46] shadow-[0_8px_28px_rgba(0,0,0,0.14)] transition hover:from-white hover:to-[#cfcfd4] hover:shadow-[0_10px_32px_rgba(0,0,0,0.18)] dark:border-white/10 dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#f4f4f5] dark:hover:from-[#52525b] dark:hover:to-[#3f3f46]"
      >
        <BrandMark size={26} />
        <span className="tracking-tight">{BRAND}</span>
      </button>

      {open && (
        <div
          dir="ltr"
          className="fixed bottom-[4.75rem] right-5 z-50 flex h-[min(560px,calc(100vh-7rem))] w-[min(94vw,400px)] flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-[#fbfbfa] text-[13.5px] text-[#37352f] shadow-[0_16px_60px_rgba(15,15,15,0.16)] dark:border-[#2f2f2f] dark:bg-[#191919] dark:text-[#e8e8e8] dark:shadow-[0_16px_60px_rgba(0,0,0,0.55)]"
        >
          {/* رأس Notion-style */}
          <div className="flex items-center gap-2.5 border-b border-[#e9e9e7] px-3.5 py-2.5 dark:border-[#2f2f2f]">
            <BrandMark size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tracking-tight">{BRAND}</span>
                <span className="rounded-full bg-gradient-to-r from-[#e5e5e5] to-[#cfcfcf] px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-[#52525b] dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#a1a1aa]">
                  AI
                </span>
              </div>
              <p className="truncate text-[11px] text-[#9b9a97] dark:text-[#787878]">
                Search &amp; suggest · read-only
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
              aria-label="Close"
              onClick={close}
              className="rounded-md px-1.5 py-0.5 text-[#9b9a97] transition hover:bg-[#f1f1ef] hover:text-[#37352f] dark:hover:bg-[#2a2a2a] dark:hover:text-[#e8e8e8]"
            >
              ✕
            </button>
          </div>

          {signedIn === false ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <BrandMark size={48} />
              <p className="font-semibold">{BRAND} is for members</p>
              <p
                className="text-[12.5px] text-[#787774] dark:text-[#9b9b9b]"
                dir="rtl"
              >
                سجّل الدخول لتستعمل {BRAND} مجانًا
              </p>
              <Link
                href="/signin"
                className="rounded-full bg-gradient-to-b from-[#f4f4f5] to-[#d4d4d8] px-4 py-1.5 text-sm font-semibold text-[#3f3f46] shadow-sm ring-1 ring-black/10 transition hover:from-white hover:to-[#cfcfd4] dark:from-[#3f3f46] dark:to-[#27272a] dark:text-[#f4f4f5] dark:ring-white/10"
              >
                Sign in
              </Link>
            </div>
          ) : (
            <>
              <div
                ref={listRef}
                className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
              >
                {msgs.length === 0 && !streamText && (
                  <div className="mx-auto max-w-[320px] pt-6 text-center">
                    <div className="mx-auto mb-3 flex justify-center">
                      <BrandMark size={44} />
                    </div>
                    <p className="text-[15px] font-semibold tracking-tight">
                      {firstName ? `Hi ${firstName}` : "Hi there"} 👋
                    </p>
                    <p
                      className="mt-2 text-[13px] leading-6 text-[#787774] dark:text-[#9b9b9b]"
                      dir="rtl"
                    >
                      أنا {BRAND} — اطلب مني مثلًا «امتحانات عنابة 2023» أو
                      «اقترح تمارين تحليل» أو «نصائح لاجتياز المسابقة» وسأبحث في
                      الموقع دون عناء.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {["امتحانات عنابة", "تمارين تحليل", "نصائح المسابقة"].map(
                        (s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setInput(s);
                              inputRef.current?.focus();
                            }}
                            className="rounded-full border border-[#e3e2e0] bg-white px-2.5 py-1 text-[11.5px] text-[#37352f] transition hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#e8e8e8] dark:hover:bg-[#2a2a2a]"
                          >
                            {s}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {msgs.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div
                        dir="auto"
                        className="max-w-[88%] whitespace-pre-wrap rounded-2xl bg-[#f1f1ef] px-3.5 py-2 text-[13.5px] leading-6 text-[#37352f] dark:bg-[#2a2a2a] dark:text-[#ececec]"
                      >
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2.5">
                      <BrandMark size={22} />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11.5px] font-medium text-[#9b9a97] dark:text-[#787878]">
                          {BRAND}
                        </p>
                        <div
                          dir="auto"
                          className="whitespace-pre-wrap text-[13.5px] leading-6"
                        >
                          {renderContent(m.content)}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {streamText && (
                  <div className="flex gap-2.5">
                    <BrandMark size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[11.5px] font-medium text-[#9b9a97] dark:text-[#787878]">
                        {BRAND}
                      </p>
                      <div
                        dir="auto"
                        className="whitespace-pre-wrap text-[13.5px] leading-6"
                      >
                        {renderContent(streamText)}
                        <span className="ms-0.5 inline-block h-[13px] w-[2px] animate-pulse bg-[#a1a1aa] align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                {busy && !streamText && (
                  <div className="flex items-center gap-2.5 text-[#9b9a97] dark:text-[#787878]">
                    <BrandMark size={22} />
                    <span className="animate-pulse text-[13px]">Thinking…</span>
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
                      ⏳ Try again in{" "}
                      <b>{status ? timeLeft(status.resetAt) : ""}</b>
                    </p>
                    <p
                      className="mt-1 text-[12px] text-[#787774] dark:text-[#9b9b9b]"
                      dir="rtl"
                    >
                      استعملت كل رسائلك — ادعمنا لنضيف المزيد مستقبلًا!
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

              {/* Composer — Notion AI style */}
              <div className="shrink-0 px-3 pb-3 pt-1">
                <div className="rounded-2xl border border-[#e3e2e0] bg-white shadow-[0_0_0_1px_rgba(15,15,15,0.03),0_8px_24px_rgba(15,15,15,0.06)] focus-within:border-[#cfcfc8] dark:border-[#3a3a3a] dark:bg-[#202020] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_rgba(0,0,0,0.35)] dark:focus-within:border-[#555]">
                  <textarea
                    ref={inputRef}
                    value={input}
                    rows={1}
                    onChange={(e) => {
                      setInput(e.target.value);
                      const el = e.target;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 120) + "px";
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
                        ? "Come back later ⏳"
                        : `Ask ${BRAND} anything…`
                    }
                    disabled={exhausted || busy}
                    className="max-h-[120px] min-h-[44px] w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-[13.5px] leading-5 outline-none placeholder:text-[#9b9a97] disabled:opacity-50 dark:placeholder:text-[#787878]"
                  />
                  <div className="flex items-center gap-2 px-2.5 pb-2.5">
                    <span className="flex-1 text-[11px] text-[#9b9a97] dark:text-[#787878]">
                      {status && !exhausted
                        ? `${status.remaining} messages left`
                        : "Enter to send"}
                    </span>
                    <button
                      type="button"
                      onClick={send}
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
      )}
    </>
  );
}
