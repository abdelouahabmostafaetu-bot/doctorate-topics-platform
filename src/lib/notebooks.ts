// =====================================================================
//  الكراريس الشخصية — طبقة الحماية والأنواع
//  كل شيء هنا محصور في المشرف الأعلى (SUPER_ADMIN)
// =====================================================================

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type NotebookPageLite = {
  id: string;
  number: number;
  title: string | null;
  content: string;
  updatedAt: string;
};

export type NotebookWithPages = {
  id: string;
  title: string;
  subtitle: string | null;
  color: string;
  coverId: string | null;
  order: number;
  pageCount: number;
  updatedAt: string;
  pages: NotebookPageLite[];
};

/** يتحقق من أن المستخدم هو المشرف الأعلى، وإلا يرمي خطأ. */
export async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("هذه المساحة مخصصة للمشرف الأعلى فقط");
  }
  return session;
}

/** هل الزائر مشرف أعلى؟ (دون رمي خطأ) */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "SUPER_ADMIN";
}

/** قائمة الكراريس مع عدد الصفحات. */
export async function listNotebooks() {
  const rows = await prisma.notebook.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { pages: true } } },
  });

  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.subtitle,
    color: n.color,
    coverId: n.coverId,
    order: n.order,
    pageCount: n._count.pages,
    updatedAt: n.updatedAt.toISOString(),
  }));
}

export type NotebookCard = Awaited<ReturnType<typeof listNotebooks>>[number];

/** كرّاس واحد مع كل صفحاته مرتّبة. */
export async function loadNotebook(id: string): Promise<NotebookWithPages | null> {
  const nb = await prisma.notebook.findUnique({
    where: { id },
    include: { pages: { orderBy: { number: "asc" } } },
  });
  if (!nb) return null;

  return {
    id: nb.id,
    title: nb.title,
    subtitle: nb.subtitle,
    color: nb.color,
    coverId: nb.coverId,
    order: nb.order,
    pageCount: nb.pages.length,
    updatedAt: nb.updatedAt.toISOString(),
    pages: nb.pages.map((p) => ({
      id: p.id,
      number: p.number,
      title: p.title,
      content: p.content,
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

/** ألوان جاهزة للكراريس (متناغمة مع هوية الموقع). */
export const NOTEBOOK_COLORS = [
  "#163a70",
  "#0f766e",
  "#b45309",
  "#6d28d9",
  "#be123c",
  "#1d4ed8",
  "#a21caf",
  "#4d7c0f",
];
