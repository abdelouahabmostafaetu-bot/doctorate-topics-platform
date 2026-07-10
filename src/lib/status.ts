// مساعدات صفحة حالة النظام (System Status — الأسبوع 7)
import { prisma } from "@/lib/prisma";

export const SERVICE_LABELS: Record<string, string> = {
  website: "الموقع",
  search: "البحث",
  downloads: "التحميلات",
  auth: "تسجيل الدخول",
  database: "قاعدة البيانات",
  email: "خدمة البريد",
  storage: "تخزين الملفات",
};

export const SERVICE_KEYS = Object.keys(SERVICE_LABELS);

// الخدمات التي يمكن فحصها تلقائيًا كل 5 دقائق عبر /api/cron/health
const AUTO_CHECKED = new Set(["database", "email", "storage"]);

export const STATE_LABELS: Record<string, string> = {
  operational: "🟢 يعمل بشكل طبيعي",
  degraded: "🟡 أداء متدهور",
  down: "🔴 متعطل / تحت الصيانة",
};

/** يضمن وجود صف حالة لكل خدمة من الخدمات السبع (FR-701) */
export async function ensureServiceStatuses() {
  const existing = await prisma.serviceStatus.findMany();
  const existingKeys = new Set(existing.map((s) => s.key));
  const missing = SERVICE_KEYS.filter((k) => !existingKeys.has(k as never));

  if (missing.length > 0) {
    await prisma.serviceStatus.createMany({
      data: missing.map((key) => ({
        key: key as never,
        labelAr: SERVICE_LABELS[key],
        state: "operational",
        mode: AUTO_CHECKED.has(key) ? "auto" : "manual",
      })),
    });
  }

  return prisma.serviceStatus.findMany({ orderBy: { key: "asc" } });
}
