// عرض المحتوى الرياضي: Markdown + معادلات LaTeX عبر KaTeX (يُصيّر على الخادم — قرار AD-06)
import { Children, isValidElement, type ReactNode } from "react";
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

/* =====================================================================
   تنسيق الأسئلة الفرعية — القاعدة 1 من docs/LATEX-FORMATTING-RULES.md

   كل فقرة تبدأ بعلامة فرع عريضة — **(a)**، **(b)**، **(i)**، **1.** —
   تحصل تلقائيًا على إزاحة بسيطة من حاشية السطر ومساحة رأسية قبلها.

   يُطبّق على كل تمارين الموقع (الجزائر، سنغافورة، تايوان، الولايات المتحدة)
   دون تعديل أي نص في قاعدة البيانات. التنسيق في العرض وحده.
   ===================================================================== */

// علامات مقبولة: a  (a)  a)  A.  i)  (iv)  1.  (12)
const SUBQUESTION_LABEL =
  /^\(?\s*(?:[a-zA-Z]|[ivxIVX]{1,4}|\d{1,2})\s*\)?\s*[.)]?\s*$/;

function plainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return plainText(node.props.children);
  }
  return "";
}

/** هل تبدأ الفقرة بعلامة سؤال فرعي عريضة؟ */
function isSubquestion(children: ReactNode): boolean {
  const first = Children.toArray(children).find(
    (child) => typeof child !== "string" || child.trim() !== "",
  );
  if (!isValidElement(first) || first.type !== "strong") return false;
  const label = plainText(first).trim();
  // حد أقصى 6 محارف: يمنع اعتبار عناوين مثل **Hint:** أو **Part I** أسئلة فرعية
  return label.length > 0 && label.length <= 6 && SUBQUESTION_LABEL.test(label);
}

// أنماط مضمّنة (inline) حتى تتغلّب على قاعدة `.math-content p` في globals.css
const SUBQUESTION_STYLE = {
  paddingInlineStart: "1.6rem",
  marginTop: "0.9rem",
  marginBottom: "0.35rem",
} as const;

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
        components={{
          // إزاحة بسيطة لأسطر (a) (b) (c) — تنسيق احترافي موحّد لكل التمارين
          p: ({ children }) =>
            isSubquestion(children) ? (
              <p className="math-subquestion" style={SUBQUESTION_STYLE}>
                {children}
              </p>
            ) : (
              <p>{children}</p>
            ),
          // عرض الصور (أشكال التمارين) بشكل متمركز وأنيق
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt ?? "شكل توضيحي"}
              loading="lazy"
              className="mx-auto my-4 block max-h-96 w-auto max-w-full rounded-lg border bg-white p-2 shadow-sm"
            />
          ),
        }}
      >
        {normalizeMath(content)}
      </ReactMarkdown>
    </div>
  );
}
