"use client";

// المتصلون الآن — عرض مباشر للمستخدمين النشطين خلال آخر دقيقتين
// اضغط على أي مستخدم لرؤية نشاطه الكامل: الصفحة الحالية، ما تصفّحه، وما حمّله
// هذه الصفحة خاصة بلوحة الإدارة فقط (محمية عبر AdminLayout والـ API)

import { useEffect, useState } from "react";

type OnlineUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: string;
  lastSeenAt: string;
  lastPath: string | null;
  lastPathTitle: string | null;
};

type Activity = {
  id: string;
  action: string; // "view" تصفّح | "download" حمّل
  path: string;
  label: string | null;
  createdAt: string;
};

const REFRESH_INTERVAL_MS = 30_000;

function lastSeenLabel(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 70) return "نشط الآن";
  return `نشط منذ ${Math.floor(seconds / 60)} د`;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 70) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function pageLabel(path: string | null, title: string | null): string {
  if (title && title.trim()) return title;
  if (!path) return "غير معروف";
  if (path === "/") return "الصفحة الرئيسية";
  return path;
}

export default function AdminOnlinePage() {
  const [users, setUsers] = useState<OnlineUser[] | null>(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selected, setSelected] = useState<OnlineUser | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [activityError, setActivityError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/admin/online-users", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { users: OnlineUser[] };
        if (!active) return;
        setUsers(data.users);
        setUpdatedAt(new Date());
        setError(false);
      } catch {
        if (active) setError(true);
      }
    }

    load();
    const intervalId = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // تحميل سجل نشاط المستخدم المحدد عند الضغط عليه
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setActivities(null);
    setActivityError(false);
    fetch(`/api/admin/users/${selected.id}/activity`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d: { activities: Activity[] }) => {
        if (active) setActivities(d.activities);
      })
      .catch(() => {
        if (active) setActivityError(true);
      });
    return () => {
      active = false;
    };
  }, [selected]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          المتصلون الآن
          {users ? (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-bold text-green-600">
              {users.length}
            </span>
          ) : null}
        </h2>
        {updatedAt ? (
          <span className="text-[10px] text-muted-foreground">
            آخر تحديث: {updatedAt.toLocaleTimeString("ar-DZ")} — يتجدد تلقائيًا
            كل 30 ثانية
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        👆 اضغط على أي مستخدم لرؤية نشاطه الكامل: الصفحة الحالية، ما تصفّحه،
        وما حمّله من ملفات.
      </p>

      {error ? (
        <p className="mt-4 text-xs text-red-500">
          تعذر تحميل قائمة المتصلين — أعد تحميل الصفحة.
        </p>
      ) : users === null ? (
        <p className="mt-4 text-xs text-muted-foreground">جارٍ التحميل…</p>
      ) : users.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          لا يوجد مستخدمون متصلون حاليًا.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => setSelected(u)}
                className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-right transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="relative inline-block shrink-0">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image}
                      alt={u.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {u.name.trim().charAt(0).toUpperCase() || "؟"}
                    </span>
                  )}
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">
                    {u.name}
                    {u.role !== "USER" ? " 🛡️" : ""}
                  </span>
                  <span
                    dir="ltr"
                    className="block truncate text-[11px] text-muted-foreground"
                  >
                    @{u.username}
                  </span>
                  <span className="block truncate text-[10px] text-primary">
                    📄 {pageLabel(u.lastPath, u.lastPathTitle)}
                  </span>
                  <span className="block text-[10px] text-green-600">
                    {lastSeenLabel(u.lastSeenAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* نافذة تفاصيل نشاط المستخدم */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {selected.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {selected.name.trim().charAt(0).toUpperCase() || "؟"}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {selected.name}
                    {selected.role !== "USER" ? " 🛡️" : ""}
                  </p>
                  <p
                    dir="ltr"
                    className="truncate text-[11px] text-muted-foreground"
                  >
                    @{selected.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* الصفحة الحالية */}
            <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/5 p-2.5">
              <p className="text-[11px] font-bold text-green-700 dark:text-green-400">
                📍 الصفحة الحالية ({lastSeenLabel(selected.lastSeenAt)})
              </p>
              <p className="mt-1 truncate text-xs font-medium">
                {pageLabel(selected.lastPath, selected.lastPathTitle)}
              </p>
              {selected.lastPath ? (
                <p
                  dir="ltr"
                  className="truncate text-[10px] text-muted-foreground"
                >
                  {selected.lastPath}
                </p>
              ) : null}
            </div>

            {/* سجل النشاط */}
            <p className="mt-4 text-xs font-bold">🕒 آخر النشاطات</p>
            {activityError ? (
              <p className="mt-2 text-xs text-red-500">
                تعذر تحميل سجل النشاط — أغلق النافذة وحاول مجددًا.
              </p>
            ) : activities === null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                جارٍ التحميل…
              </p>
            ) : activities.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                لا يوجد نشاط مسجّل بعد — سيبدأ التسجيل من تصفّحه القادم.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 rounded-lg border p-2"
                  >
                    <span className="text-sm">
                      {a.action === "download" ? "⬇️" : "📖"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">
                        {a.action === "download" ? "حمّل: " : "تصفّح: "}
                        {a.label || a.path}
                      </span>
                      <span
                        dir="ltr"
                        className="block truncate text-[10px] text-muted-foreground"
                      >
                        {a.path}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
