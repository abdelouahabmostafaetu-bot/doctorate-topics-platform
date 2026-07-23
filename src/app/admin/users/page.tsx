"use client";

// إدارة المستخدمين — كل المسجلين في الموقع مع إمكانية الحظر / فك الحظر
// خاصة بلوحة الإدارة فقط (محمية عبر AdminLayout والـ API)

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  points: number;
  blocked: boolean;
  createdAt: string;
  lastSeenAt: string | null;
};

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const REFRESH_INTERVAL_MS = 60 * 1000;

function isOnline(lastSeenAt: string | null, now: number): boolean {
  if (!lastSeenAt) return false;
  return now - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
}

function arabicUnit(
  value: number,
  singular: string,
  dual: string,
  plural: string,
): string {
  if (value === 1) return singular;
  if (value === 2) return dual;
  return `${value} ${plural}`;
}

function lastActiveLabel(lastSeenAt: string | null, now: number): string {
  if (!lastSeenAt) return "لم يُسجّل نشاط بعد";

  const diffMs = Math.max(0, now - new Date(lastSeenAt).getTime());
  if (diffMs <= ONLINE_WINDOW_MS) return "متصل الآن";

  const totalMinutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (totalMinutes < 60) {
    return `نشط منذ ${arabicUnit(totalMinutes, "دقيقة", "دقيقتين", "دقائق")}`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    const hours = arabicUnit(totalHours, "ساعة", "ساعتين", "ساعات");
    if (remainingMinutes >= 5 && totalHours < 3) {
      const minutes = arabicUnit(remainingMinutes, "دقيقة", "دقيقتين", "دقائق");
      return `نشط منذ ${hours} و${minutes}`;
    }
    return `نشط منذ ${hours}`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (totalDays < 30) {
    const days = arabicUnit(totalDays, "يوم", "يومين", "أيام");
    if (remainingHours > 0) {
      const hours = arabicUnit(remainingHours, "ساعة", "ساعتين", "ساعات");
      return `نشط منذ ${days} و${hours}`;
    }
    return `نشط منذ ${days}`;
  }

  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) {
    return `نشط منذ ${arabicUnit(totalMonths, "شهر", "شهرين", "أشهر")}`;
  }

  const totalYears = Math.max(1, Math.floor(totalDays / 365));
  return `نشط منذ ${arabicUnit(totalYears, "سنة", "سنتين", "سنوات")}`;
}

function roleBadge(role: AdminUser["role"]): string {
  if (role === "SUPER_ADMIN") return "🛡️ مدير أعلى";
  if (role === "ADMIN") return "🛡️ مدير";
  return "مستخدم";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as { users: AdminUser[] };
        if (active) {
          setUsers(data.users);
          setError(null);
          setNow(Date.now());
        }
      } catch {
        if (active) setError("تعذر تحميل قائمة المستخدمين — أعد تحميل الصفحة.");
      }
    }

    void loadUsers();
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
      void loadUsers();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!users) return null;
    // الترتيب: المتصلون الآن أولًا، ثم الأحدث نشاطًا فالأقدم، ومن لم يُسجّل نشاط في الأخير
    const sorted = [...users].sort((a, b) => {
      const aOnline = isOnline(a.lastSeenAt, now) ? 1 : 0;
      const bOnline = isOnline(b.lastSeenAt, now) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, query, now]);

  async function toggleBlock(user: AdminUser) {
    const next = !user.blocked;
    const confirmMsg = next
      ? `حظر "${user.name}"؟ لن يتمكن من تسجيل الدخول بعد الآن.`
      : `فك الحظر عن "${user.name}"؟`;
    if (!window.confirm(confirmMsg)) return;

    setBusyId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, blocked: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const code = data?.error;
        window.alert(
          code === "cannot_block_self"
            ? "لا يمكنك حظر نفسك."
            : code === "cannot_block_super_admin"
              ? "لا يمكن حظر مدير أعلى."
              : code === "admin_requires_super_admin"
                ? "حظر مدير يتطلب صلاحية مدير أعلى."
                : "تعذر تنفيذ العملية — حاول مجددًا.",
        );
        return;
      }
      setUsers(
        (prev) =>
          prev?.map((u) => (u.id === user.id ? { ...u, blocked: next } : u)) ??
          null,
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">
          👥 المستخدمون
          {users ? (
            <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              {users.length}
            </span>
          ) : null}
          {users && users.some((u) => u.blocked) ? (
            <span className="mr-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-500">
              ⛔ {users.filter((u) => u.blocked).length} محظور
            </span>
          ) : null}
        </h2>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 بحث بالاسم أو اسم المستخدم…"
          className="w-56 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error ? (
        <p className="mt-4 text-xs text-red-500">{error}</p>
      ) : filtered === null ? (
        <p className="mt-4 text-xs text-muted-foreground">جارٍ التحميل…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">لا توجد نتائج.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((u) => (
            <li
              key={u.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border p-2.5 ${
                u.blocked ? "opacity-70" : ""
              }`}
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
                {isOnline(u.lastSeenAt, now) ? (
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                ) : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">
                  {u.name}
                  {u.blocked ? (
                    <span className="mr-1.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                      ⛔ محظور
                    </span>
                  ) : null}
                </span>
                <span
                  dir="ltr"
                  className="block truncate text-[11px] text-muted-foreground"
                >
                  @{u.username}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {roleBadge(u.role)} · ⭐ {u.points} · انضمَّ{" "}
                  {new Date(u.createdAt).toLocaleDateString("ar-DZ")}
                  <span
                    className={
                      isOnline(u.lastSeenAt, now)
                        ? "font-bold text-green-600"
                        : "text-muted-foreground"
                    }
                  >
                    {` · ${lastActiveLabel(u.lastSeenAt, now)}`}
                  </span>
                </span>
              </span>

              {u.role !== "SUPER_ADMIN" ? (
                <button
                  type="button"
                  disabled={busyId === u.id}
                  onClick={() => toggleBlock(u)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
                    u.blocked
                      ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                      : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  }`}
                >
                  {busyId === u.id ? "…" : u.blocked ? "✅ فك الحظر" : "⛔ حظر"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
