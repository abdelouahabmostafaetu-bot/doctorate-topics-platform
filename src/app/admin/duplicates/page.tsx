import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { AiCompareButton } from "@/components/admin/ai-compare-button";
import {
  aiCompareGroupAction,
  deleteDuplicateTopicAction,
  deleteSpecialtyAction,
  deleteUniversityAction,
  mergeSpecialtiesAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "مقارنة وتنظيف — لوحة الإدارة",
};

type SP = { mode?: string; university?: string };

const statusLabel: Record<string, string> = {
  published: "✅ منشور",
  draft: "📝 مسودة",
  needs_completion: "⛳ ناقص",
};

const selectClass =
  "rounded-md border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none";

// تقطيع العنوان إلى كلمات للمقارنة
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N} ]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

type TopicLike = {
  id: string;
  title: string;
  examNumber: number | null;
  specialtyId: string;
  problems: unknown[];
};

// الخوارزمية الذكية: نسبة تشابه بين موضوعين داخل نفس (الجامعة+السنة)
function similarity(a: TopicLike, b: TopicLike): number {
  let s = 0;
  if (a.examNumber != null && a.examNumber === b.examNumber) s += 45;
  if (a.specialtyId === b.specialtyId) s += 15;
  if (a.problems.length === b.problems.length) s += 15;
  s += Math.round(jaccard(tokenize(a.title), tokenize(b.title)) * 25);
  return Math.min(100, s);
}

export default async function DuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const strict = sp.mode === "specialty";

  const [universities, specialties, topics, specCountsRaw, uniCountsRaw] =
    await Promise.all([
      prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
      prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
      prisma.topic.findMany({
        where: sp.university ? { universityId: sp.university } : undefined,
        include: { university: true, specialty: true },
        orderBy: [{ year: "desc" }, { createdAt: "asc" }],
      }),
      prisma.topic.aggregateRaw({
        pipeline: [{ $group: { _id: "$specialtyId", n: { $sum: 1 } } }],
      }) as unknown as Promise<Array<{ _id: { $oid: string }; n: number }>>,
      prisma.topic.aggregateRaw({
        pipeline: [{ $group: { _id: "$universityId", n: { $sum: 1 } } }],
      }) as unknown as Promise<Array<{ _id: { $oid: string }; n: number }>>,
    ]);

  const specCount = new Map<string, number>();
  for (const r of specCountsRaw) specCount.set(r._id.$oid, r.n);
  const uniCount = new Map<string, number>();
  for (const r of uniCountsRaw) uniCount.set(r._id.$oid, r.n);

  // تجميع حسب (الجامعة + السنة) أو (+ التخصص)
  const groups = new Map<string, typeof topics>();
  for (const t of topics) {
    const key = strict
      ? [t.universityId, t.year, t.specialtyId].join("|")
      : [t.universityId, t.year].join("|");
    const arr = groups.get(key);
    if (arr) {
      arr.push(t);
    } else {
      groups.set(key, [t]);
    }
  }

  // لكل مجموعة: أعلى نسبة تشابه لكل موضوع مقارنة ببقية المجموعة
  const groupInfo = Array.from(groups.values())
    .filter((g) => g.length > 1)
    .map((g) => {
      const sims = new Map<string, number>();
      let maxSim = 0;
      for (let i = 0; i < g.length; i++) {
        for (let j = i + 1; j < g.length; j++) {
          const s = similarity(g[i], g[j]);
          sims.set(g[i].id, Math.max(sims.get(g[i].id) ?? 0, s));
          sims.set(g[j].id, Math.max(sims.get(g[j].id) ?? 0, s));
          if (s > maxSim) maxSim = s;
        }
      }
      return { g, sims, maxSim };
    })
    .sort((a, b) => b.maxSim - a.maxSim || b.g.length - a.g.length);

  const suspectCount = groupInfo.filter((x) => x.maxSim >= 75).length;

  // تخصصات بأسماء متطابقة تقريبًا → مرشحة للدمج
  const nameSeen = new Map<string, number>();
  for (const s of specialties) {
    const k = (s.nameAr || s.name).trim().toLowerCase();
    nameSeen.set(k, (nameSeen.get(k) ?? 0) + 1);
  }

  const dateFmt = new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" });

  return (
    <div>
      {/* رأس صغير */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">🔍 مقارنة المواضيع — كشف التكرار</h2>
        <span className="text-[11px] text-muted-foreground">
          {groupInfo.length} مجموعة · {suspectCount} مشتبه بها بقوة · من فحص{" "}
          {topics.length} موضوعًا
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        الخوارزمية تحسب نسبة التشابه (رقم الموضوع + التخصص + عدد التمارين +
        تشابه العنوان) — راجع المشتبه به وقرّر الحذف بنفسك.
      </p>

      {/* فلاتر صغيرة */}
      <form
        method="get"
        action="/admin/duplicates"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <select
          name="mode"
          defaultValue={strict ? "specialty" : "univ-year"}
          className={selectClass}
        >
          <option value="univ-year">نفس الجامعة + السنة</option>
          <option value="specialty">نفس الجامعة + السنة + التخصص (أدق)</option>
        </select>
        <select
          name="university"
          defaultValue={sp.university ?? ""}
          className={selectClass}
        >
          <option value="">🏛️ كل الجامعات</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nameAr || u.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full border px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          تطبيق
        </button>
      </form>

      {/* المجموعات المشتبه بها */}
      {groupInfo.length === 0 ? (
        <p className="mt-6 py-8 text-center text-xs text-muted-foreground">
          🎉 لا توجد مواضيع متطابقة وفق هذا المعيار
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {groupInfo.map(({ g, sims, maxSim }) => {
            const first = g[0];
            const groupKey =
              first.universityId +
              "-" +
              first.year +
              "-" +
              (strict ? first.specialtyId : "all");
            return (
              <section key={groupKey}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold">
                    🏛️ {first.university.nameAr} — {first.year}
                    {strict ? " — " + first.specialty.nameAr : ""}
                  </h3>
                  <span className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
                  <span
                    className={
                      maxSim >= 75
                        ? "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {g.length} مواضيع · أعلى تشابه {maxSim}%
                  </span>
                </div>
                <AiCompareButton
                  action={aiCompareGroupAction.bind(null, g.map((t) => t.id))}
                  legend={g.map((t, i) => ({ k: "T" + (i + 1), title: t.title }))}
                />
                <div className="mt-1 divide-y">
                  {g.map((t) => {
                    const sim = sims.get(t.id) ?? 0;
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center gap-2 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/topics/${t.slug}`}
                            target="_blank"
                            className="block truncate text-xs font-medium hover:text-primary hover:underline"
                          >
                            {t.title}
                          </Link>
                          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span>
                              {t.examType === "specialty" ? "تخصص" : "عامة"}
                            </span>
                            {t.examNumber != null && (
                              <span>رقم {t.examNumber}</span>
                            )}
                            <span>{t.specialty.nameAr}</span>
                            <span>{t.problems.length} تمرين</span>
                            <span>{statusLabel[t.status] ?? t.status}</span>
                            <span>أُضيف {dateFmt.format(t.createdAt)}</span>
                            {sim >= 75 ? (
                              <span className="font-bold text-red-600 dark:text-red-400">
                                ⚠️ مشتبه به — تشابه {sim}%
                              </span>
                            ) : sim >= 50 ? (
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                تشابه {sim}%
                              </span>
                            ) : (
                              <span>تشابه {sim}%</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Link
                            href={`/admin/topics/${t.id}`}
                            className="rounded-full border px-2.5 py-0.5 text-[10px] transition hover:border-primary hover:text-primary"
                          >
                            تعديل
                          </Link>
                          <ConfirmActionButton
                            action={deleteDuplicateTopicAction.bind(null, t.id)}
                            confirmText={`هل أنت متأكد من حذف “${t.title}” نهائيًا؟ لا يمكن التراجع.`}
                            label="🗑️ حذف"
                            pendingLabel="جارٍ..."
                            className="rounded-full border px-2.5 py-0.5 text-[10px] transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* تنظيف التصنيفات */}
      <div
        id="cleanup"
        className="mt-8 h-px bg-gradient-to-l from-primary/40 via-border to-transparent"
      />
      <h2 className="mt-4 text-sm font-bold">🧹 تنظيف التصنيفات</h2>

      {/* دمج تخصصين */}
      <section className="mt-3">
        <h3 className="text-xs font-bold">🔗 دمج تخصصين تحت اسم واحد</h3>
        <form
          action={mergeSpecialtiesAction}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <select name="fromId" required className={selectClass}>
            <option value="">التخصص الذي سيُحذف (المصدر)</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr || s.name} ({specCount.get(s.id) ?? 0})
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">←</span>
          <select name="toId" required className={selectClass}>
            <option value="">التخصص الذي سيبقى (الوجهة)</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr || s.name} ({specCount.get(s.id) ?? 0})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground transition hover:opacity-90"
          >
            دمج
          </button>
          <span className="text-[10px] text-muted-foreground">
            تُنقل كل مواضيع المصدر إلى الوجهة ثم يُحذف المصدر — لا تراجع
          </span>
        </form>
      </section>

      {/* قائمة التخصصات */}
      <section className="mt-5">
        <h3 className="text-xs font-bold">🧭 التخصصات ({specialties.length})</h3>
        <div className="mt-1 divide-y">
          {specialties.map((s) => {
            const n = specCount.get(s.id) ?? 0;
            const dupName =
              (nameSeen.get((s.nameAr || s.name).trim().toLowerCase()) ?? 0) >
              1;
            return (
              <div key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">
                  {s.nameAr || s.name}
                  <span className="ms-2 text-[10px] text-muted-foreground" dir="ltr">
                    {s.name}
                  </span>
                </span>
                {dupName && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    ⚠️ اسم مكرر — ادمجه
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {n} موضوع
                </span>
                {n === 0 ? (
                  <ConfirmActionButton
                    action={deleteSpecialtyAction.bind(null, s.id)}
                    confirmText={`حذف التخصص “${s.nameAr || s.name}” نهائيًا؟`}
                    label="🗑️ حذف"
                    pendingLabel="جارٍ..."
                    className="rounded-full border px-2.5 py-0.5 text-[10px] transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                  />
                ) : (
                  <span
                    title="لا يمكن الحذف وهو مرتبط بمواضيع — ادمجه أولًا"
                    className="cursor-not-allowed rounded-full border px-2.5 py-0.5 text-[10px] text-muted-foreground opacity-50"
                  >
                    🗑️ حذف
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* قائمة الجامعات */}
      <section className="mt-5">
        <h3 className="text-xs font-bold">🏛️ الجامعات ({universities.length})</h3>
        <div className="mt-1 divide-y">
          {universities.map((u) => {
            const n = uniCount.get(u.id) ?? 0;
            return (
              <div key={u.id} className="flex items-center gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs">
                  {u.nameAr || u.name}
                  <span className="ms-2 text-[10px] text-muted-foreground" dir="ltr">
                    {u.name}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {n} موضوع
                </span>
                {n === 0 ? (
                  <ConfirmActionButton
                    action={deleteUniversityAction.bind(null, u.id)}
                    confirmText={`حذف الجامعة “${u.nameAr || u.name}” نهائيًا؟`}
                    label="🗑️ حذف"
                    pendingLabel="جارٍ..."
                    className="rounded-full border px-2.5 py-0.5 text-[10px] transition hover:border-destructive hover:text-destructive disabled:opacity-50"
                  />
                ) : (
                  <span
                    title="لا يمكن الحذف وهي مرتبطة بمواضيع"
                    className="cursor-not-allowed rounded-full border px-2.5 py-0.5 text-[10px] text-muted-foreground opacity-50"
                  >
                    🗑️ حذف
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
