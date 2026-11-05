export const statusLabels = {
  open: ["مفتوح", "Open"],
  closing: ["يغلق قريبًا", "Closing soon"],
  closed: ["مغلق", "Closed"],
  unknown: ["يحتاج إلى تحقق", "Needs verification"],
} as const;

export const statusDot = {
  open: "bg-emerald-500",
  closing: "bg-amber-500",
  closed: "bg-slate-400",
  unknown: "bg-sky-400",
} as const;

export const fundLabels = {
  fully_funded: ["تمويل كامل", "Fully funded"],
  partially_funded: ["تمويل جزئي", "Partially funded"],
  salary: ["منصب براتب", "Salaried position"],
  unknown: ["التمويل غير محدد", "Funding unspecified"],
} as const;

export const kindLabels = {
  phd: ["دكتوراه", "PhD"],
  scholarship: ["منحة", "Scholarship"],
  master: ["منحة ماستر", "Master's scholarship"],
} as const;

export function formatDeadline(deadline: string, en: boolean) {
  if (!deadline) return en ? "Not specified" : "غير محدد";
  const d = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return deadline;
  return d.toLocaleDateString(en ? "en-GB" : "ar-DZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function daysLeft(deadline: string) {
  if (!deadline) return null;
  const d = Date.parse(`${deadline}T00:00:00Z`);
  if (!Number.isFinite(d)) return null;
  return Math.ceil((d - Date.now()) / 86_400_000);
}
