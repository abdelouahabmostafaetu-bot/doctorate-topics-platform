"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: UserRole;
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

function arabicUnit(value: number, singular: string, dual: string, plural: string): string {
  if (value === 1) return singular;
  if (value === 2) return dual;
  return `${value} ${plural}`;
}

function lastActiveLabel(lastSeenAt: string | null, now: number): string {
  if (!lastSeenAt) return "لم يُسجّل نشاط بعد";
  const diffMs = Math.max(0, now - new Date(lastSeenAt).getTime());
  if (diffMs <= ONLINE_WINDOW_MS) return "متصل الآن";
  const totalMinutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (totalMinutes < 60) return `نشط منذ ${arabicUnit(totalMinutes, "دقيقة", "دقيقتين", "دقائق")}`;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    const hours = arabicUnit(totalHours, "ساعة", "ساعتين", "ساعات");
    if (remainingMinutes >= 5 && totalHours < 3) return `نشط منذ ${hours} و${arabicUnit(remainingMinutes, "دقيقة", "دقيقتين", "دقائق")}`;
    return `نشط منذ ${hours}`;
  }
  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (totalDays < 30) {
    const days = arabicUnit(totalDays, "يوم", "يومين", "أيام");
    return remainingHours > 0 ? `نشط منذ ${days} و${arabicUnit(remainingHours, "ساعة", "ساعتين", "ساعات")}` : `نشط منذ ${days}`;
  }
  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) return `نشط منذ ${arabicUnit(totalMonths, "شهر", "شهرين", "أشهر")}`;
  return `نشط منذ ${arabicUnit(Math.max(1, Math.floor(totalDays / 365)), "سنة", "سنتين", "سنوات")}`;
}

function roleBadge(role: UserRole): string {
  if (role === "SUPER_ADMIN") return "🛡️ مدير أعلى";
  if (role === "ADMIN") return "🛡️ مدير";
  return "مستخدم";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [viewerRole, setViewerRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (!response.ok) throw new Error("failed");
        const data = (await response.json()) as { users: AdminUser[]; viewerRole: UserRole };
        if (active) {
          setUsers(data.users);
          setViewerRole(data.viewerRole);
          setError(null);
          setNow(Date.now());
        }
      } catch {
        if (active) setError("تعذر تحميل قائمة المستخدمين — أعد تحميل الصفحة.");
      }
    }
    void loadUsers();
    const intervalId = window.setInterval(() => { setNow(Date.now()); void loadUsers(); }, REFRESH_INTERVAL_MS);
    return () => { active = false; window.clearInterval(intervalId); };
  }, []);

  const filtered = useMemo(() => {
    if (!users) return null;
    const sorted = [...users].sort((a, b) => {
      const onlineDifference = Number(isOnline(b.lastSeenAt, now)) - Number(isOnline(a.lastSeenAt, now));
      if (onlineDifference) return onlineDifference;
      return (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0) - (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0);
    });
    const value = query.trim().toLowerCase();
    if (!value) return sorted;
    return sorted.filter((user) => user.name.toLowerCase().includes(value) || user.username.toLowerCase().includes(value));
  }, [users, query, now]);

  async function promoteUser(user: AdminUser) {
    if (!window.confirm(`ترقية "${user.name}" إلى أدمن؟`)) return;
    setBusyId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "promote" }),
      });
      if (!response.ok) {
        window.alert("تعذرت ترقية المستخدم إلى أدمن.");
        return;
      }
      setUsers((previous) => previous?.map((item) => item.id === user.id ? { ...item, role: "ADMIN" } : item) ?? null);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBlock(user: AdminUser) {
    const next = !user.blocked;
    if (!window.confirm(next ? `حظر "${user.name}"؟` : `فك الحظر عن "${user.name}"؟`)) return;
    setBusyId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, blocked: next }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        window.alert(data?.error === "cannot_block_self" ? "لا يمكنك حظر نفسك." : data?.error === "cannot_block_super_admin" ? "لا يمكن حظر مدير أعلى." : data?.error === "admin_requires_super_admin" ? "حظر مدير يتطلب صلاحية مدير أعلى." : "تعذر تنفيذ العملية.");
        return;
      }
      setUsers((previous) => previous?.map((item) => item.id === user.id ? { ...item, blocked: next } : item) ?? null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">👥 المستخدمون{users && <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{users.length}</span>}{users?.some((user) => user.blocked) && <span className="mr-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-500">⛔ {users.filter((user) => user.blocked).length} محظور</span>}</h2>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="🔍 بحث بالاسم أو اسم المستخدم…" className="w-56 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary" />
      </div>

      {error ? <p className="mt-4 text-xs text-red-500">{error}</p> : filtered === null ? <p className="mt-4 text-xs text-muted-foreground">جارٍ التحميل…</p> : filtered.length === 0 ? <p className="mt-4 text-xs text-muted-foreground">لا توجد نتائج.</p> : (
        <ul className="mt-4 space-y-2">
          {filtered.map((user) => (
            <li key={user.id} className={`flex flex-wrap items-center gap-3 rounded-xl border p-2.5 ${user.blocked ? "opacity-70" : ""}`}>
              <span className="relative inline-block shrink-0">
                {user.image ? <img src={user.image} alt={user.name} className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{user.name.trim().charAt(0).toUpperCase() || "؟"}</span>}
                {isOnline(user.lastSeenAt, now) && <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{user.name}{user.blocked && <span className="mr-1.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">⛔ محظور</span>}</span>
                <span dir="ltr" className="block truncate text-[11px] text-muted-foreground">@{user.username}</span>
                <span className="block text-[10px] text-muted-foreground">{roleBadge(user.role)} · ⭐ {user.points} · انضمَّ {new Date(user.createdAt).toLocaleDateString("ar-DZ")}<span className={isOnline(user.lastSeenAt, now) ? "font-bold text-green-600" : "text-muted-foreground"}>{` · ${lastActiveLabel(user.lastSeenAt, now)}`}</span></span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {viewerRole === "SUPER_ADMIN" && user.role === "USER" && !user.blocked && (
                  <button type="button" disabled={busyId === user.id} onClick={() => promoteUser(user)} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50">{busyId === user.id ? "…" : "🛡️ ترقية إلى أدمن"}</button>
                )}
                {user.role !== "SUPER_ADMIN" && (
                  <button type="button" disabled={busyId === user.id} onClick={() => toggleBlock(user)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${user.blocked ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}>{busyId === user.id ? "…" : user.blocked ? "✅ فك الحظر" : "⛔ حظر"}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
