// عرض محتوى المقال: Markdown + LaTeX + صور محسّنة + فيديوهات لا تُحمّل إلا عند التشغيل.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { EmbeddedYoutube } from "@/components/embedded-youtube";
import { cn } from "@/lib/utils";

const REFERENCE_MARKERS = ["**المصدر والترخيص:**", "**المرجع والترخيص:**"];

function normalizeMath(src: string): string {
  return src
    .replace(/```math\r?\n([\s\S]*?)```/g, (_m, body) => `\n$$\n${body}\n$$\n`)
    .replace(/\$`([\s\S]*?)`\$/g, (_m, body) => `$${body}$`);
}

function splitReference(content: string) {
  const referenceIndex = Math.max(
    ...REFERENCE_MARKERS.map((marker) => content.lastIndexOf(marker)),
  );
  if (referenceIndex === -1) return { body: content, reference: null };

  return {
    body: content.slice(0, referenceIndex).trimEnd(),
    reference: content.slice(referenceIndex).trim(),
  };
}

function isYoutubeEmbed(src: string) {
  return (
    src.startsWith("https://www.youtube.com/embed/") ||
    src.startsWith("https://www.youtube-nocookie.com/embed/")
  );
}

export function ArticleContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const { body, reference } = splitReference(content);

  return (
    <div dir="rtl" className={cn("article-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt }) => {
            const imageSrc = typeof src === "string" ? src : "";
            const label = alt?.replace(/^youtube:\s*/i, "") || "وسائط المقال";

            if (isYoutubeEmbed(imageSrc)) {
              return <EmbeddedYoutube src={imageSrc} title={label} />;
            }

            return (
              <span className="my-8 block overflow-hidden rounded-2xl border border-border/70 bg-white shadow-md shadow-black/5 dark:bg-zinc-950">
                <span className="flex min-h-40 items-center justify-center bg-zinc-50 p-2 sm:p-4 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt={alt ?? "صورة توضيحية"}
                    loading="lazy"
                    decoding="async"
                    className="mx-auto block max-h-screen w-auto max-w-full rounded-xl object-contain"
                  />
                </span>
                {alt && (
                  <span className="block border-t border-border/60 px-4 py-3 text-center text-xs leading-6 text-muted-foreground sm:text-sm">
                    {alt}
                  </span>
                )}
              </span>
            );
          },
        }}
      >
        {normalizeMath(body)}
      </ReactMarkdown>

      {reference && (
        <footer
          dir="rtl"
          className="article-reference mt-8 border-t border-border/60 pt-2 text-[8px] leading-4 text-muted-foreground/80 sm:mt-10 sm:pt-3 sm:text-[9px]"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reference}</ReactMarkdown>
        </footer>
      )}
    </div>
  );
}
