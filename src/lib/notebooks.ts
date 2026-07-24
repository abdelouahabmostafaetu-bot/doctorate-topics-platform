// =====================================================================
//  Study notebooks - guard layer, types and loaders
//  Everything here is restricted to SUPER_ADMIN
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

/** Throws unless the current user is the super admin. */
export async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    throw new Error("This space is restricted to the super admin");
  }
  return session;
}

/** Is the visitor a super admin? (no throw) */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "SUPER_ADMIN";
}

/** All notebooks with their page counts. */
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

/** One notebook with all of its pages in order. */
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

/** Preset notebook colors (aligned with the site identity). */
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
