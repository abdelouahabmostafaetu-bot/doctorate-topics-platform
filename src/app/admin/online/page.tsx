"use client";

// المتصلون الآن — عرض مباشر (بأسلوب فيسبوك) للمستخدمين النشطين خلال آخر دقيقتين
// هذه الصفحة خاصة بلوحة الإدارة فقط (محمية عبر AdminLayout والـ API)

import { useEffect, useState } from "react";

type OnlineUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: string;
  lastSeenAt: string;
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

export default function AdminOnlinePage() {
  const [users, setUsers] = useState<OnlineUser[] | null>(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl border p-2.5"
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
              <span className="min-w-0">
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
                <span className="block text-[10px] text-green-600">
                  {lastSeenLabel(u.lastSeenAt)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
