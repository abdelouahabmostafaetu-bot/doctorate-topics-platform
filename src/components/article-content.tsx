// عرض محتوى المقال: Markdown + LaTeX مع اتجاه RTL للعربية.
// مرجع Stack Exchange يُعرض في تذييل صغير مستقل، لا ضمن نص المقال.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

// يدعم الصياغتين القديمة والجديدة كي يبقى التذييل خارج نص المقال.
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
