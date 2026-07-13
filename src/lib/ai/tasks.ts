// تعريف مهام الذكاء الاصطناعي — مشترك بين الواجهة والخادم

export type AiTaskId = "latex" | "duplicates" | "vision" | "general";

export const AI_TASKS: Array<{ id: AiTaskId; label: string; desc: string }> = [
  {
    id: "latex",
    label: "✨ تحسين كتابة LaTeX",
    desc: "يعيد صياغة المعادلات في صفحة مراجعة LaTeX (زر التحسين بالرابط وسكربت التحسين الجماعي)",
  },
  {
    id: "duplicates",
    label: "🔍 كشف المواضيع المكررة",
    desc: "يقارن محتوى المواضيع في صفحة (مقارنة وتنظيف) ويقترح الحذف مع نسبة التشابه",
  },
  {
    id: "vision",
    label: "📷 قراءة الصور وPDF (استيراد المواضيع)",
    desc: "يقرأ صور الاختبارات ويستخرج الموضوع تلقائيًا — يتطلب نموذجًا يدعم الصور مثل pixtral-large-latest، وقراءة PDF تتطلب مفتاح Mistral (خدمة OCR)",
  },
  {
    id: "general",
    label: "🧠 عام (احتياطي)",
    desc: "يُستخدم تلقائيًا لأي مهمة ليس لها مفتاح مخصص",
  },
];

export function taskLabel(id: string): string {
  const hit = AI_TASKS.find((t) => t.id === id);
  return hit ? hit.label : id;
}

export function taskDesc(id: string): string {
  const hit = AI_TASKS.find((t) => t.id === id);
  return hit ? hit.desc : "";
}
