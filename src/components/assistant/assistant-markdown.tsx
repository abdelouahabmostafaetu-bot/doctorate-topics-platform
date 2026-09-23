"use client";

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Streamdown, type ExtraProps } from "streamdown";
import { code } from "@streamdown/code";
import { cjk } from "@streamdown/cjk";
import { math } from "@streamdown/math";

const SITE_HOST = "https://www.docmathdz.dev";

function safeHref(rawHref: string | undefined) {
  if (!rawHref) return null;
  if (rawHref.startsWith("/")) return rawHref;
  if (rawHref.startsWith(SITE_HOST)) return rawHref.slice(SITE_HOST.length) || "/";
  try {
    const url = new URL(rawHref);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function AssistantLink({ href, children }: ComponentPropsWithoutRef<"a"> & ExtraProps) {
  const safe = safeHref(href);
  if (!safe) return <span>{children}</span>;
  const external = safe.startsWith("http");
  return (
    <a
      href={safe}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
    >
      {children}
    </a>
  );
}

function AssistantCode({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"code"> & ExtraProps) {
  const [copied, setCopied] = useState(false);
  const source = String(children).replace(/\n$/, "");
  const isLatex = /language-(?:latex|tex|math)\b/i.test(className ?? "");
  const isMermaid = /language-mermaid\b/i.test(className ?? "");
  const isBlock = Boolean(className) || source.includes("\n");

  if (!isBlock) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  async function copyLatex() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className={`my-3 block overflow-hidden rounded-xl border ${isLatex ? "border-sky-500/25 bg-sky-500/5" : "border-[#e3e2e0] bg-[#f7f7f5] dark:border-[#3a3a3a] dark:bg-[#202020]"}`}>
      <span className="block overflow-x-auto p-3 text-left text-[12px] leading-6" dir="ltr">
        {isMermaid && <span className="mb-2 block text-[10px] font-semibold text-[#787774] dark:text-[#9b9b9b]">مخطط قابل للنسخ إلى Mermaid Live</span>}
        <code className={className} {...props}>{source}</code>
      </span>
      <button
        type="button"
        onClick={copyLatex}
        className={`block border-t px-3 py-2 text-left text-[11px] font-semibold transition ${isLatex ? "border-sky-500/15 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300" : "border-[#e3e2e0] text-[#52525b] hover:bg-white dark:border-[#3a3a3a] dark:text-[#d4d4d8] dark:hover:bg-[#2a2a2a]"}`}
      >
        {copied ? "✓ تم النسخ" : isLatex ? "⧉ Copier le LaTeX" : "⧉ نسخ الكود"}
      </button>
    </span>
  );
}

function AssistantTable({
  children,
  ...props
}: ComponentPropsWithoutRef<"table"> & ExtraProps) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-[#e3e2e0] dark:border-[#3a3a3a]">
      <table {...props} className="w-full min-w-[420px] border-collapse text-[12px] leading-6 [&_td]:border-t [&_td]:border-[#e3e2e0] [&_td]:px-3 [&_td]:py-2 [&_th]:bg-[#f7f7f5] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold dark:[&_td]:border-[#3a3a3a] dark:[&_th]:bg-[#202020]">
        {children}
      </table>
    </div>
  );
}

export function AssistantMarkdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <Streamdown
      dir="auto"
      className="mathora-ai-markdown"
      animated
      isAnimating={streaming}
      parseIncompleteMarkdown
      plugins={{ code, cjk, math }}
      components={{
        a: AssistantLink,
        code: AssistantCode,
        table: AssistantTable,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-s-2 border-primary/40 bg-primary/5 px-3 py-2 text-[0.95em] italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-[#e3e2e0] dark:border-[#3a3a3a]" />,
      }}
      linkSafety={{ enabled: true }}
    >
      {content}
    </Streamdown>
  );
}