import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_HOURS = Number(process.env.ASSISTANT_WINDOW_HOURS ?? 4);
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
const ASSISTANT_LIMIT = Number(process.env.ASSISTANT_MESSAGES ?? 50);
const DAILY_MESSAGES = Number(process.env.AI_DAILY_MESSAGES ?? 30);
const DAILY_IMAGES = Number(process.env.AI_DAILY_IMAGES ?? 5);
const DAILY_FILES = Number(process.env.AI_DAILY_FILES ?? 3);

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - dt.getTime();
  if (ms < 0) return "الآن";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const days = Math.floor(h / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return fmtDate(dt);
}

function resetIn(windowStart: Date): string {
  const ms = windowStart.getTime() + WINDOW_MS - Date.now();
  if (ms <= 0) return "انتهت (ستُفتح عند الرسالة التالية)";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.max(1, Math.ceil((ms % 3_600_000) / 60_000));
  return h > 0 ? `${h} س و ${m} د` : `${m} د`;
}

type UserMini = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  lastSeenAt: Date | null;
};

export default async function AdminAiUsagePage() {
  const day = todayUTC();
  const day7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const day30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  let error = "";
  let readingToday: Array<{
    id: string;
    userId: string;
    day: string;
    messages: number;
    images: number;
    files: number;
    updatedAt: Date;
  }> = [];
  let readingRecent: Array<{
    userId: string;
    day: string;
    messages: number;
    images: number;
    files: number;
    updatedAt: Date;
  }> = [];
  let mathoraRows: Array<{
    id: string;
    userId: string;
    windowStart: Date;
    count: number;
    totalCount?: number;
    updatedAt?: Date;
  }> = [];

  try {
    readingToday = await prisma.aiUsage.findMany({
      where: { day },
      orderBy: [{ messages: "desc" }, { updatedAt: "desc" }],
      take: 200,
    });
  } catch {
    error =
      "تعذر قراءة ai_usage — تأكد من وجود model AiUsage و prisma generate";
  }

  try {
    readingRecent = await prisma.aiUsage.findMany({
      where: { day: { gte: day30 } },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    });
  } catch {
    // ignore if partial
  }

  try {
    mathoraRows = await prisma.assistantUsage.findMany({
      orderBy: { count: "desc" },
      take: 200,
    });
  } catch {
    if (!error)
      error = "تعذر قراءة assistant_usage — تأكد من وجود model AssistantUsage";
  }

  const userIds = new Set<string>();
  for (const r of readingToday) userIds.add(r.userId);
  for (const r of readingRecent) userIds.add(r.userId);
  for (const r of mathoraRows) userIds.add(r.userId);

  const users = userIds.size
    ? await prisma.user
        .findMany({
          where: { id: { in: [...userIds] } },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            lastSeenAt: true,
          },
        })
        .catch(() => [] as UserMini[])
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  // تجميع قراءة 7/30 يوم
  type Agg = {
    userId: string;
    messages7: number;
    messages30: number;
    images30: number;
    files30: number;
    daysActive30: number;
    lastAt: Date | null;
    todayMessages: number;
    todayImages: number;
    todayFiles: number;
  };
  const agg = new Map<string, Agg>();

  function ensure(uid: string): Agg {
    let a = agg.get(uid);
    if (!a) {
      a = {
        userId: uid,
        messages7: 0,
        messages30: 0,
        images30: 0,
        files30: 0,
        daysActive30: 0,
        lastAt: null,
        todayMessages: 0,
        todayImages: 0,
        todayFiles: 0,
      };
      agg.set(uid, a);
    }
    return a;
  }

  for (const r of readingRecent) {
    const a = ensure(r.userId);
    a.messages30 += r.messages;
    a.images30 += r.images;
    a.files30 += r.files;
    a.daysActive30 += r.messages > 0 || r.images > 0 || r.files > 0 ? 1 : 0;
    if (r.day >= day7) a.messages7 += r.messages;
    if (!a.lastAt || r.updatedAt > a.lastAt) a.lastAt = r.updatedAt;
    if (r.day === day) {
      a.todayMessages = r.messages;
      a.todayImages = r.images;
      a.todayFiles = r.files;
    }
  }

  // Mathora map
  const mathoraByUser = new Map(mathoraRows.map((m) => [m.userId, m]));
  for (const m of mathoraRows) ensure(m.userId);

  const rows = [...agg.values()].sort((a, b) => {
    const ta = a.lastAt?.getTime() ?? 0;
    const tb = b.lastAt?.getTime() ?? 0;
    const ma = mathoraByUser.get(a.userId);
    const mb = mathoraByUser.get(b.userId);
    const la = Math.max(
      ta,
      ma?.updatedAt?.getTime?.() ?? ma?.windowStart.getTime() ?? 0,
    );
    const lb = Math.max(
      tb,
      mb?.updatedAt?.getTime?.() ?? mb?.windowStart.getTime() ?? 0,
    );
    return lb - la;
  });

  // إحصائيات عامة
  const sumTodayMsg = readingToday.reduce((s, r) => s + r.messages, 0);
  const sumTodayImg = readingToday.reduce((s, r) => s + r.images, 0);
  const sumTodayFiles = readingToday.reduce((s, r) => s + r.files, 0);
  const activeReadingToday = readingToday.filter((r) => r.messages > 0).length;
  const now = Date.now();
  const mathoraActiveWindow = mathoraRows.filter((m) => {
    const inWindow = now - m.windowStart.getTime() < WINDOW_MS;
    return inWindow && m.count > 0;
  }).length;
  const mathoraMsgsWindow = mathoraRows.reduce((s, m) => {
    const inWindow = now - m.windowStart.getTime() < WINDOW_MS;
    return s + (inWindow ? m.count : 0);
  }, 0);
  const mathoraLifetimeAll = mathoraRows.reduce(
    (s, m) => s + (typeof m.totalCount === "number" ? m.totalCount : m.count),
    0,
  );

  return (
    <div className="space-y-5 text-sm" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">📈 استخدام الذكاء الاصطناعي</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            من يستخدم Mathora ووضع القراءة، وكم رسالة/صورة/ملف، وآخر نشاط
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/ai"
            className="rounded-lg border px-3 py-1.5 font-bold hover:bg-secondary"
          >
            ← إدارة المفاتيح
          </Link>
          <Link
            href="/admin/ai/status"
            className="rounded-lg border px-3 py-1.5 font-bold hover:bg-secondary"
          >
            📊 حالة المفاتيح
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          ⚠️ {error}
        </div>
      ) : null}

      {/* بطاقات ملخص */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="رسائل القراءة اليوم"
          value={String(sumTodayMsg)}
          hint={`حد المستخدم: ${DAILY_MESSAGES}/يوم · مستخدمون نشطون: ${activeReadingToday}`}
        />
        <StatCard
          label="صور / ملفات اليوم"
          value={`${sumTodayImg} / ${sumTodayFiles}`}
          hint={`حدود: ${DAILY_IMAGES} صور · ${DAILY_FILES} ملفات`}
        />
        <StatCard
          label="Mathora (النافذة الحالية)"
          value={String(mathoraMsgsWindow)}
          hint={`${mathoraActiveWindow} مستخدم · حد ${ASSISTANT_LIMIT} / ${WINDOW_HOURS}س`}
        />
        <StatCard
          label="إجمالي Mathora المسجّل"
          value={String(mathoraLifetimeAll)}
          hint={`${mathoraRows.length} مستخدم استخدم Mathora`}
        />
      </div>

      <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-[11px] leading-6 text-muted-foreground dark:border-amber-900/40 dark:bg-amber-950/20">
        <b className="text-foreground">ملاحظة:</b> لا نحفظ نص المحادثة (خصوصية).
        نعرض فقط العدادات ووقت آخر استخدام. وضع القراءة = DeepSeek على صفحة
        الموضوع. Mathora = Kimi على الصفحة الرئيسية وباقي الصفحات. اليوم = {day}{" "}
        (UTC).
      </div>

      {/* جدول موحّد */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[920px] text-right text-xs">
          <thead>
            <tr className="border-b bg-secondary/50">
              <th className="p-2.5 font-bold">المستخدم</th>
              <th className="p-2.5 font-bold">آخر استخدام AI</th>
              <th className="p-2.5 font-bold">قراءة اليوم</th>
              <th className="p-2.5 font-bold">قراءة 7 أيام</th>
              <th className="p-2.5 font-bold">قراءة 30 يوم</th>
              <th className="p-2.5 font-bold">Mathora (نافذة)</th>
              <th className="p-2.5 font-bold">Mathora إجمالي</th>
              <th className="p-2.5 font-bold">إعادة ضبط Mathora</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  لا يوجد استخدام مسجّل بعد — بعد أول رسالة من عضو ستظهر هنا.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const u = userMap.get(r.userId);
                const m = mathoraByUser.get(r.userId);
                const mLast =
                  m?.updatedAt ?? (m && m.count > 0 ? m.windowStart : null);
                const lastCandidates = [r.lastAt, mLast].filter(
                  Boolean,
                ) as Date[];
                const last =
                  lastCandidates.length > 0
                    ? new Date(
                        Math.max(...lastCandidates.map((d) => d.getTime())),
                      )
                    : null;
                const inWindow = m && now - m.windowStart.getTime() < WINDOW_MS;
                const mCount = inWindow ? m!.count : 0;
                const mTotal =
                  typeof m?.totalCount === "number"
                    ? m.totalCount
                    : (m?.count ?? 0);
                const readingPct = Math.min(
                  100,
                  Math.round((r.todayMessages / DAILY_MESSAGES) * 100),
                );
                const mathoraPct = Math.min(
                  100,
                  Math.round((mCount / ASSISTANT_LIMIT) * 100),
                );

                return (
                  <tr
                    key={r.userId}
                    className="border-b last:border-0 hover:bg-secondary/30"
                  >
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        {u?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                            {(u?.name || "?").slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-bold">
                            {u?.name || "مستخدم محذوف"}
                          </div>
                          <div
                            className="truncate text-[10px] text-muted-foreground"
                            dir="ltr"
                          >
                            {u?.email || r.userId}
                          </div>
                          {u?.role && u.role !== "USER" ? (
                            <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold text-primary">
                              {u.role}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-medium">{timeAgo(last)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {fmtDate(last)}
                      </div>
                      {u?.lastSeenAt ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          متصل بالموقع: {timeAgo(u.lastSeenAt)}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold">
                        {r.todayMessages}
                        <span className="font-normal text-muted-foreground">
                          /{DAILY_MESSAGES}
                        </span>
                      </div>
                      <Bar pct={readingPct} />
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        🖼 {r.todayImages} · 📎 {r.todayFiles}
                      </div>
                    </td>
                    <td className="p-2.5 font-mono" dir="ltr">
                      {r.messages7}
                    </td>
                    <td className="p-2.5">
                      <div className="font-mono" dir="ltr">
                        {r.messages30} msg
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.daysActive30} يوم نشط · 🖼 {r.images30} · 📎{" "}
                        {r.files30}
                      </div>
                    </td>
                    <td className="p-2.5">
                      {m ? (
                        <>
                          <div className="font-bold">
                            {mCount}
                            <span className="font-normal text-muted-foreground">
                              /{ASSISTANT_LIMIT}
                            </span>
                          </div>
                          <Bar pct={mathoraPct} tone="silver" />
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono" dir="ltr">
                      {m ? mTotal : "—"}
                    </td>
                    <td className="p-2.5 text-[11px]">
                      {m && inWindow && mCount > 0 ? (
                        <>
                          <div>⏳ {resetIn(m.windowStart)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            بدأ: {fmtDate(m.windowStart)}
                          </div>
                        </>
                      ) : m ? (
                        <span className="text-muted-foreground">
                          نافذة جديدة
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* قسم Mathora فقط — مرتب حسب الاستهلاك */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">
          🤖 Mathora — تفاصيل النافذة ({WINDOW_HOURS} ساعات)
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-right text-xs">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="p-2.5">#</th>
                <th className="p-2.5">المستخدم</th>
                <th className="p-2.5">رسائل النافذة</th>
                <th className="p-2.5">المتبقي</th>
                <th className="p-2.5">بداية النافذة</th>
                <th className="p-2.5">إعادة الضبط بعد</th>
                <th className="p-2.5">إجمالي الحياة</th>
              </tr>
            </thead>
            <tbody>
              {mathoraRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-5 text-center text-muted-foreground"
                  >
                    لا أحد استخدم Mathora بعد
                  </td>
                </tr>
              ) : (
                mathoraRows
                  .slice()
                  .sort((a, b) => {
                    const ca =
                      now - a.windowStart.getTime() < WINDOW_MS ? a.count : 0;
                    const cb =
                      now - b.windowStart.getTime() < WINDOW_MS ? b.count : 0;
                    return cb - ca || b.count - a.count;
                  })
                  .map((m, i) => {
                    const u = userMap.get(m.userId);
                    const inWindow = now - m.windowStart.getTime() < WINDOW_MS;
                    const count = inWindow ? m.count : 0;
                    const left = Math.max(0, ASSISTANT_LIMIT - count);
                    const total =
                      typeof m.totalCount === "number" ? m.totalCount : m.count;
                    return (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="p-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="p-2.5">
                          <div className="font-bold">{u?.name || "—"}</div>
                          <div
                            className="text-[10px] text-muted-foreground"
                            dir="ltr"
                          >
                            {u?.email || m.userId}
                          </div>
                        </td>
                        <td className="p-2.5 font-bold">
                          {count}/{ASSISTANT_LIMIT}
                        </td>
                        <td className="p-2.5">{left}</td>
                        <td className="p-2.5 text-[11px]">
                          {fmtDate(m.windowStart)}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          {inWindow && count > 0 ? resetIn(m.windowStart) : "—"}
                        </td>
                        <td className="p-2.5 font-mono" dir="ltr">
                          {total}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* قراءة اليوم فقط */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold">
          📖 وضع القراءة — اليوم ({day} UTC)
        </h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-right text-xs">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="p-2.5">#</th>
                <th className="p-2.5">المستخدم</th>
                <th className="p-2.5">رسائل</th>
                <th className="p-2.5">صور</th>
                <th className="p-2.5">ملفات</th>
                <th className="p-2.5">آخر رسالة</th>
              </tr>
            </thead>
            <tbody>
              {readingToday.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-5 text-center text-muted-foreground"
                  >
                    لا استخدام لقراءة اليوم بعد
                  </td>
                </tr>
              ) : (
                readingToday.map((r, i) => {
                  const u = userMap.get(r.userId);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="p-2.5">
                        <div className="font-bold">{u?.name || "—"}</div>
                        <div
                          className="text-[10px] text-muted-foreground"
                          dir="ltr"
                        >
                          {u?.email || r.userId}
                        </div>
                      </td>
                      <td className="p-2.5 font-bold">
                        {r.messages}/{DAILY_MESSAGES}
                      </td>
                      <td className="p-2.5">
                        {r.images}/{DAILY_IMAGES}
                      </td>
                      <td className="p-2.5">
                        {r.files}/{DAILY_FILES}
                      </td>
                      <td className="p-2.5 text-[11px]">
                        <div>{timeAgo(r.updatedAt)}</div>
                        <div className="text-muted-foreground">
                          {fmtDate(r.updatedAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight" dir="ltr">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function Bar({
  pct,
  tone = "primary",
}: {
  pct: number;
  tone?: "primary" | "silver";
}) {
  const cls =
    tone === "silver"
      ? "bg-gradient-to-l from-[#a1a1aa] to-[#d4d4d8]"
      : "bg-primary/80";
  return (
    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
      <div
        className={`h-full rounded-full ${cls}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
