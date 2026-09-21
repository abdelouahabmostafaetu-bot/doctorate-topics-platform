"use client";

import { useState } from "react";

export function CopyLatexButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:border-sky-500/60 hover:bg-sky-500/10 dark:text-sky-300"
      aria-label={copied ? "LaTeX copié" : "Copier le LaTeX de l'exercice"}
    >
      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
      {copied ? "LaTeX copié" : "Copier le LaTeX"}
    </button>
  );
}