"use client";

import { useState } from "react";

export function CopyCcp({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard unavailable
        }
      }}
      className="rounded-md border border-amber-300/60 px-3 py-1 text-xs text-muted-foreground transition hover:bg-amber-100/60 hover:text-amber-700 dark:border-amber-700/40 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
    >
      {copied ? "✓ تم النسخ" : "📋 نسخ الرقم"}
    </button>
  );
}
