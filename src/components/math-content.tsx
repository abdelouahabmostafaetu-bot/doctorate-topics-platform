// عرض المحتوى الرياضي: Markdown + معادلات LaTeX عبر KaTeX (يُصيّر على الخادم — قرار AD-06)
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/**
 * بيانات mylibrary تستخدم صيغة GitLab للمعادلات:
 *   - سطرية:  $`...`$
 *   - كتلة:   ```math ... ```
 * نحولها إلى صيغة $...$ و $$...$$ التي يفهمها remark-math
 */
function normalizeMath(src: string): string {
  return src
    .replace(/```math\r?\n([\s\S]*?)```/g, (_m, body) => `\n$$\n${body}\n$$\n`)
    .replace(/\$`([\s\S]*?)`\$/g, (_m, body) => `$${body}$`);
}

export function MathContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  // المحتوى الرياضي بالفرنسية — جزيرة LTR داخل الصفحة العربية (قاعدة RTL من وثيقة التصميم)
  return (
    <div dir="ltr" className={cn("math-content text-left", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalizeMath(content)}
      </ReactMarkdown>
    </div>
  );
}
