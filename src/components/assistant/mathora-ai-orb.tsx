"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "mathora-orb-chat-v1";
const SUPPORT_EVENT = "docmath-support-notice";
const BRAND = "Mathora";
const SITE_HOST = "https://www.docmathdz.dev";

type Msg = { role: "user" | "assistant"; content: string };
type Status = {
  name: string;
  limit: number;
  remaining: number;
  resetAt: string;
};

const SUGGESTIONS = [
  "اقترح لي مواضيع تحليل دالي للمراجعة",
  "ابحث عن امتحانات جامعة عنابة",
  "ما أفضل خطة تحضير للدكتوراه؟",
  "أعطني مواضيع مشابهة في الجبر",
];

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
      .slice(-30);
  } catch {
    return [];
  }
}

function saveMsgs(msgs: Msg[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30)));
  } catch {
    // ignore
  }
}

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

function renderContent(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re =
    /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|(https?:\/\/[^\s)\]<]+)|(?<![\w/])(\/(?:topics|search|universities|guide|coffee|revision|contribute|library|lectures|theses)[^\s)\]<]*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const label = match[1] || "فتح الرابط";
    const href = toHref(match[2] || match[3] || match[4] || "");
    const external = href.startsWith("http");
    out.push(
      <a
        key={key++}
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="font-semibold text-[#59677f] underline decoration-[#c7ceda] underline-offset-2 hover:text-[#2f3440] dark:text-[#b8c7e5] dark:hover:text-white"
      >
        {label}
      </a>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function OrbLogo({ size = 42 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white via-zinc-100 to-zinc-300 shadow-inner ring-1 ring-black/10 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-950 dark:ring-white/15"
      style={{ width: size, height: size }}
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
      <span className="pointer-events-none absolute left-[27%] top-[37%] h-1.5 w-1.5 animate-[mathora-blink_5.5s_infinite] rounded-full bg-zinc-900 shadow-sm dark:bg-white" />
      <span className="pointer-events-none absolute right-[27%] top-[37%] h-1.5 w-1.5 animate-[mathora-blink_5.5s_infinite] rounded-full bg-zinc-900 shadow-sm dark:bg-white" />
      <span className="pointer-events-none absolute bottom-[22%] h-[2px] w-3 rounded-full bg-zinc-800/60 dark:bg-white/70" />
    </span>
  );
}

export function MathoraAiOrb() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMsgs(loadMsgs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveMsgs(msgs);
  }, [msgs, hydrated]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight });
  }, [msgs, streamText, open]);

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
    if (!open) return;
    loadStatus();
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, loadStatus]);

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
        throw new Error(data?.error || "request_failed");
      }

      const remaining = Number(res.headers.get("X-AI-Remaining"));
      const resetAt = res.headers.get("X-AI-Reset");
      if (Number.isFinite(remaining) && resetAt) {
        setStatus((s) => (s ? { ...s, remaining, resetAt } : s));
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
      if (full.trim())
        setMsgs((cur) => [...cur, { role: "assistant", content: full }]);
      else setError("لم يصل رد من المساعد. حاول مرة أخرى.");
    } catch {
      setError("تعذّر الاتصال بالمساعد. حاول مرة أخرى بعد لحظات.");
    } finally {
      setStreamText("");
      setBusy(false);
    }
  }

  const exhausted = !!status && status.remaining <= 0;
  const firstName = status?.name?.trim().split(/\s+/)[0] || "";

  if (pathname?.startsWith("/mathora")) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes mathora-orb-float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.015);
          }
        }
        @keyframes mathora-blink {
          0%,
          91%,
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
          94%,
          97% {
            transform: scaleY(0.08);
            opacity: 0.8;
          }
        }
        @keyframes mathora-ring {
          0% {
            transform: scale(0.86);
            opacity: 0.55;
          }
          70%,
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
      `}</style>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] sm:bg-transparent"
          onClick={() => setOpen(false)}
        >
          <section
            dir="rtl"
            aria-label="Mathora AI"
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-3 bottom-3 top-16 flex flex-col overflow-hidden rounded-[1.7rem] border border-black/10 bg-[#fbfbfa] shadow-[0_24px_80px_rgba(15,15,15,0.25)] dark:border-white/10 dark:bg-[#191919] sm:inset-auto sm:bottom-24 sm:left-5 sm:h-[660px] sm:max-h-[calc(100vh-7rem)] sm:w-[430px]"
          >
            <div className="flex items-center gap-3 border-b border-[#e8e8e5] bg-white/80 px-4 py-3 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#202020]/80">
              <OrbLogo size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold tracking-tight text-[#37352f] dark:text-[#f4f4f5]">
                    {BRAND} AI
                  </p>
                  <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-zinc-900">
                    Orb
                  </span>
                </div>
                <p className="truncate text-[11px] text-[#787774] dark:text-[#9b9b9b]">
                  مساعد ذكي يقرأ أرشيف المواضيع ويقترح روابط مباشرة
                </p>
              </div>
              {status && !exhausted && (
                <span className="rounded-full border border-[#e3e2e0] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#787774] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#b0b0b0]">
                  {status.remaining}/{status.limit}
                </span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#787774] transition hover:bg-[#f1f1ef] hover:text-[#37352f] dark:hover:bg-[#2a2a2a] dark:hover:text-white"
                aria-label="تصغير"
              >
                ✕
              </button>
            </div>

            {signedIn === false ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <OrbLogo size={58} />
                <p className="font-semibold text-[#37352f] dark:text-[#f4f4f5]">
                  Mathora AI للأعضاء فقط
                </p>
                <p className="max-w-xs text-sm leading-7 text-[#787774] dark:text-[#9b9b9b]">
                  سجّل الدخول لتستعمل المساعد في البحث داخل مواضيع الدكتوراه
                  والحصول على اقتراحات مخصصة.
                </p>
                <Link
                  href="/signin"
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  تسجيل الدخول
                </Link>
              </div>
            ) : (
              <>
                <div
                  ref={listRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
                >
                  {msgs.length === 0 && !streamText && (
                    <div className="pt-5 text-center">
                      <div className="mb-3 flex justify-center">
                        <OrbLogo size={58} />
                      </div>
                      <p className="text-[16px] font-bold text-[#37352f] dark:text-[#f4f4f5]">
                        {firstName ? `مرحبًا ${firstName}` : "مرحبًا بك"} 👋
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-7 text-[#787774] dark:text-[#9b9b9b]">
                        اسألني عن أي جامعة، سنة، تخصص، أو موضوع. سأبحث في أرشيف
                        DocMath DZ وأعطيك روابط مباشرة مع اقتراحات مراجعة.
                      </p>
                      <div className="mt-4 grid gap-2 text-right">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => send(s)}
                            className="rounded-2xl border border-[#e3e2e0] bg-white px-3.5 py-2.5 text-[12.5px] text-[#37352f] shadow-sm transition hover:border-[#c7c7cc] hover:bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ececec] dark:hover:border-[#555]"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msgs.map((m, i) =>
                    m.role === "user" ? (
                      <div key={i} className="flex justify-start">
                        <div
                          dir="auto"
                          className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#37352f] px-3.5 py-2 text-[13px] leading-6 text-white dark:bg-[#e8e8e8] dark:text-[#191919]"
                        >
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-2.5 text-right">
                        <OrbLogo size={24} />
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-[11px] font-semibold text-[#9b9a97] dark:text-[#787878]">
                            {BRAND}
                          </p>
                          <div
                            dir="auto"
                            className="whitespace-pre-wrap text-[13px] leading-7 text-[#37352f] dark:text-[#e8e8e8]"
                          >
                            {renderContent(m.content)}
                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  {streamText && (
                    <div className="flex gap-2.5 text-right">
                      <OrbLogo size={24} />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[11px] font-semibold text-[#9b9a97] dark:text-[#787878]">
                          {BRAND}
                        </p>
                        <div
                          dir="auto"
                          className="whitespace-pre-wrap text-[13px] leading-7 text-[#37352f] dark:text-[#e8e8e8]"
                        >
                          {renderContent(streamText)}
                          <span className="ms-1 inline-block h-3 w-[2px] animate-pulse bg-[#a1a1aa] align-middle" />
                        </div>
                      </div>
                    </div>
                  )}

                  {busy && !streamText && (
                    <div className="flex items-center gap-2 text-[13px] text-[#9b9a97]">
                      <OrbLogo size={24} />
                      <span className="animate-pulse">
                        يبحث في أرشيف المواضيع…
                      </span>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-[12px] font-medium text-red-600 dark:text-red-400">
                      ⚠️ {error}
                    </div>
                  )}
                  {exhausted && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-900 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
                      ⏳ يتجدد رصيدك بعد {status ? timeLeft(status.resetAt) : ""}
                    </div>
                  )}
                </div>

                <div className="border-t border-[#e8e8e5] bg-white/85 p-3 backdrop-blur dark:border-[#2f2f2f] dark:bg-[#202020]/85">
                  <div className="rounded-2xl border border-[#deded9] bg-white shadow-sm focus-within:border-[#b9b9b1] dark:border-[#3a3a3a] dark:bg-[#191919] dark:focus-within:border-[#5a5a5a]">
                    <textarea
                      ref={inputRef}
                      value={input}
                      rows={1}
                      disabled={busy || exhausted}
                      onChange={(e) => {
                        setInput(e.target.value);
                        const el = e.target;
                        el.style.height = "auto";
                        el.style.height = Math.min(el.scrollHeight, 132) + "px";
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
                          ? "عد لاحقًا بعد تجدد الرصيد"
                          : "اكتب رسالتك إلى Mathora AI..."
                      }
                      className="max-h-[132px] min-h-12 w-full resize-none bg-transparent px-3.5 pt-3 text-[13px] leading-6 outline-none placeholder:text-[#9b9a97] disabled:opacity-50 dark:text-[#f4f4f5]"
                    />
                    <div className="flex items-center gap-2 px-2.5 pb-2.5">
                      <Link
                        href="/mathora"
                        className="rounded-full px-2 py-1 text-[11px] font-medium text-[#787774] transition hover:bg-[#f1f1ef] dark:text-[#9b9b9b] dark:hover:bg-[#2a2a2a]"
                      >
                        فتح كامل
                      </Link>
                      <span className="flex-1 text-[10.5px] text-[#9b9a97] dark:text-[#787878]">
                        Enter للإرسال
                      </span>
                      <button
                        type="button"
                        onClick={() => send()}
                        disabled={busy || exhausted || !input.trim()}
                        className="rounded-full bg-[#37352f] px-4 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#111] disabled:opacity-40 dark:bg-white dark:text-[#191919] dark:hover:bg-zinc-200"
                      >
                        إرسال
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="افتح Mathora AI"
        className="fixed bottom-4 left-4 z-40 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white/90 shadow-[0_12px_40px_rgba(15,15,15,0.22)] ring-1 ring-black/10 backdrop-blur transition hover:scale-105 hover:shadow-[0_18px_56px_rgba(15,15,15,0.28)] focus:outline-none focus:ring-4 focus:ring-zinc-400/30 dark:bg-[#202020]/90 dark:ring-white/15 sm:bottom-5 sm:left-5"
        style={{ animation: "mathora-orb-float 4.2s ease-in-out infinite" }}
      >
        <span
          className="absolute inset-0 rounded-full bg-zinc-400/30 dark:bg-white/15"
          style={{ animation: "mathora-ring 2.8s ease-out infinite" }}
        />
        <OrbLogo size={50} />
        {msgs.length === 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-[#37352f] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm dark:bg-white dark:text-[#191919]">
            AI
          </span>
        )}
      </button>
    </>
  );
}
