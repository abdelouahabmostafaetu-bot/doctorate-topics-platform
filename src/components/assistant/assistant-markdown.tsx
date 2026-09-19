"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
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

export function AssistantMarkdown({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <Streamdown
      dir="auto"
      className="mathora-ai-markdown"
      animated
      isAnimating={streaming}
      parseIncompleteMarkdown
      plugins={{ code, cjk, math }}
      components={{ a: AssistantLink }}
      linkSafety={{ enabled: true }}
    >
      {content}
    </Streamdown>
  );
}
