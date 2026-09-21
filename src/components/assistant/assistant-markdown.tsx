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

  if (!isLatex) {
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
    <span className="my-3 block overflow-hidden rounded-xl border border-sky-500/25 bg-sky-500/5">
      <span className="block overflow-x-auto p-3 text-left text-[12px] leading-6" dir="ltr">
        <code className={className} {...props}>{source}</code>
      </span>
      <button
        type="button"
        onClick={copyLatex}
        className="block border-t border-sky-500/15 px-3 py-2 text-left text-[11px] font-semibold text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
      >
        {copied ? "✓ LaTeX copié" : "⧉ Copier le LaTeX"}
      </button>
    </span>
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
      components={{ a: AssistantLink, code: AssistantCode }}
      linkSafety={{ enabled: true }}
    >
      {content}
    </Streamdown>
  );
}