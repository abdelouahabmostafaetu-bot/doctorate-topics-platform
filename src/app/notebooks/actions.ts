"use server";

// =====================================================================
//  Notebook server actions - all guarded by SUPER_ADMIN
// =====================================================================

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, NOTEBOOK_COLORS } from "@/lib/notebooks";

function clean(s: string | null | undefined, max: number): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

// ===================== notebooks =====================

export async function createNotebookAction(input: {
  title: string;
  subtitle?: string;
  color?: string;
}) {
  await requireSuperAdmin();
  const title = clean(input.title, 120);
  if (!title) throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0643\u0631\u0651\u0627\u0633 \u0645\u0637\u0644\u0648\u0628");

  const count = await prisma.notebook.count();
  const color =
    input.color && /^#[0-9a-fA-F]{6}$/.test(input.color)
      ? input.color
      : NOTEBOOK_COLORS[count % NOTEBOOK_COLORS.length];

  const nb = await prisma.notebook.create({
    data: {
      title,
      subtitle: clean(input.subtitle, 160) || null,
      color,
      order: count,
    },
  });

  revalidatePath("/notebooks");
  return { id: nb.id };
}

export async function updateNotebookAction(input: {
  id: string;
  title?: string;
  subtitle?: string | null;
  color?: string;
  coverId?: string | null;
}) {
  await requireSuperAdmin();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const t = clean(input.title, 120);
    if (!t) throw new Error("\u0627\u0633\u0645 \u0627\u0644\u0643\u0631\u0651\u0627\u0633 \u0645\u0637\u0644\u0648\u0628");
    data.title = t;
  }
  if (input.subtitle !== undefined) data.subtitle = clean(input.subtitle, 160) || null;
  if (input.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(input.color)) data.color = input.color;
  if (input.coverId !== undefined) data.coverId = input.coverId;

  await prisma.notebook.update({ where: { id: input.id }, data });

  revalidatePath("/notebooks");
  revalidatePath("/notebooks/" + input.id);
  return { ok: true as const };
}

export async function deleteNotebookAction(input: { id: string }) {
  await requireSuperAdmin();

  const nb = await prisma.notebook.findUnique({
    where: { id: input.id },
    select: { coverId: true },
  });

  await prisma.notebookPage.deleteMany({ where: { notebookId: input.id } });
  await prisma.notebook.delete({ where: { id: input.id } });
  if (nb?.coverId) {
    await prisma.notebookImage.deleteMany({ where: { id: nb.coverId } });
  }

  revalidatePath("/notebooks");
  return { ok: true as const };
}

// ===================== pages =====================

export async function createPageAction(input: {
  notebookId: string;
  title?: string;
  content?: string;
}) {
  await requireSuperAdmin();

  const last = await prisma.notebookPage.findFirst({
    where: { notebookId: input.notebookId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;

  const page = await prisma.notebookPage.create({
    data: {
      notebookId: input.notebookId,
      number,
      title: clean(input.title, 200) || null,
      content: String(input.content ?? "").slice(0, 300000),
    },
  });
  await prisma.notebook.update({
    where: { id: input.notebookId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/notebooks/" + input.notebookId);
  return {
    id: page.id,
    number: page.number,
    title: page.title,
    content: page.content,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function updatePageAction(input: {
  id: string;
  title?: string | null;
  content?: string;
}) {
  await requireSuperAdmin();

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = clean(input.title, 200) || null;
  if (input.content !== undefined) data.content = String(input.content).slice(0, 300000);

  const page = await prisma.notebookPage.update({
    where: { id: input.id },
    data,
    select: { notebookId: true, updatedAt: true },
  });
  await prisma.notebook.update({
    where: { id: page.notebookId },
    data: { updatedAt: new Date() },
  });

  return { ok: true as const, updatedAt: page.updatedAt.toISOString() };
}

export async function deletePageAction(input: { id: string }) {
  await requireSuperAdmin();

  const page = await prisma.notebookPage.findUnique({
    where: { id: input.id },
    select: { notebookId: true, number: true },
  });
  if (!page) return { ok: true as const };

  await prisma.notebookPage.delete({ where: { id: input.id } });

  // renumber the following pages so numbering stays continuous
  const rest = await prisma.notebookPage.findMany({
    where: { notebookId: page.notebookId, number: { gt: page.number } },
    orderBy: { number: "asc" },
    select: { id: true, number: true },
  });
  for (const p of rest) {
    await prisma.notebookPage.update({
      where: { id: p.id },
      data: { number: p.number - 1 },
    });
  }

  revalidatePath("/notebooks/" + page.notebookId);
  return { ok: true as const };
}

/** Move a page one slot up or down inside its notebook. */
export async function movePageAction(input: { id: string; direction: "up" | "down" }) {
  await requireSuperAdmin();

  const page = await prisma.notebookPage.findUnique({
    where: { id: input.id },
    select: { id: true, notebookId: true, number: true },
  });
  if (!page) throw new Error("page not found");

  const target = await prisma.notebookPage.findFirst({
    where: {
      notebookId: page.notebookId,
      number: input.direction === "up" ? { lt: page.number } : { gt: page.number },
    },
    orderBy: { number: input.direction === "up" ? "desc" : "asc" },
    select: { id: true, number: true },
  });
  if (!target) return { ok: true as const };

  await prisma.notebookPage.update({ where: { id: page.id }, data: { number: -1 } });
  await prisma.notebookPage.update({ where: { id: target.id }, data: { number: page.number } });
  await prisma.notebookPage.update({ where: { id: page.id }, data: { number: target.number } });

  revalidatePath("/notebooks/" + page.notebookId);
  return { ok: true as const };
}
