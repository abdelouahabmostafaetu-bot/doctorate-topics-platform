"use server";

// إجراءات «ملاحظاتي» — كلها للمدير الأعلى (SUPER_ADMIN) فقط
// تكتب مباشرة في قاعدة mylibrary القديمة (MongoDB) دون المساس بقاعدة المنصة
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  getMylibraryDb,
  idFilter,
  isAllowedNoteCollection,
  isAllowedNotebookCollection,
  notebookRefFilter,
  type MyNote,
  type MyNotebook,
} from "@/lib/mylibrary";

async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user || user.role !== "SUPER_ADMIN") {
    throw new Error("هذه الميزة متاحة للمدير الأعلى فقط");
  }
  return user;
}

function clean(v: unknown, max: number): string {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

function assertNoteCol(col: string) {
  if (!isAllowedNoteCollection(col)) throw new Error("مجموعة ملاحظات غير مسموح بها");
}

function assertNotebookCol(col: string) {
  if (!isAllowedNotebookCollection(col)) throw new Error("مجموعة دفاتر غير مسموح بها");
}

// ===== الدفاتر =====

export async function createNotebookAction(input: {
  title: string;
  col: string;
}): Promise<MyNotebook> {
  await requireSuperAdmin();
  assertNotebookCol(input.col);
  const title = clean(input.title, 120);
  if (!title) throw new Error("اسم الدفتر مطلوب");

  const db = await getMylibraryDb();
  const now = new Date();
  const res = await db.collection(input.col).insertOne({
    title,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/admin/notes");
  return {
    id: res.insertedId.toHexString(),
    col: input.col,
    title,
    createdAt: now.toISOString(),
  };
}

export async function renameNotebookAction(input: {
  id: string;
  col: string;
  title: string;
}): Promise<{ ok: true }> {
  await requireSuperAdmin();
  assertNotebookCol(input.col);
  const title = clean(input.title, 120);
  if (!title) throw new Error("اسم الدفتر مطلوب");

  const db = await getMylibraryDb();
  await db
    .collection(input.col)
    .updateOne(idFilter(input.id), {
      $set: { title, name: title, updatedAt: new Date() },
    });

  revalidatePath("/admin/notes");
  return { ok: true };
}

export async function deleteNotebookAction(input: {
  id: string;
  col: string;
  /** true = حذف ملاحظات الدفتر أيضًا، false = نقلها إلى «غير مصنّفة» */
  deleteNotes: boolean;
  /** مجموعات الملاحظات التي يجب تنظيفها */
  noteCols: string[];
}): Promise<{ ok: true }> {
  await requireSuperAdmin();
  assertNotebookCol(input.col);
  for (const c of input.noteCols) assertNoteCol(c);

  const db = await getMylibraryDb();
  const refFilter = notebookRefFilter(input.id);

  for (const c of input.noteCols) {
    if (input.deleteNotes) {
      await db.collection(c).deleteMany(refFilter);
    } else {
      await db.collection(c).updateMany(refFilter, {
        $set: { notebookId: null, updatedAt: new Date() },
        $unset: { notebook: "", folderId: "", folder: "" },
      });
    }
  }
  await db.collection(input.col).deleteOne(idFilter(input.id));

  revalidatePath("/admin/notes");
  return { ok: true };
}

// ===== الملاحظات =====

export async function createNoteAction(input: {
  col: string;
  notebookId: string | null;
  title: string;
  content: string;
}): Promise<MyNote> {
  await requireSuperAdmin();
  assertNoteCol(input.col);

  const db = await getMylibraryDb();
  const now = new Date();
  const doc = {
    title: clean(input.title, 300) || "ملاحظة جديدة",
    content: String(input.content ?? "").slice(0, 200_000),
    notebookId: input.notebookId || null,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection(input.col).insertOne(doc);

  revalidatePath("/admin/notes");
  return {
    id: res.insertedId.toHexString(),
    col: input.col,
    title: doc.title,
    content: doc.content,
    notebookId: doc.notebookId,
    pinned: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateNoteAction(input: {
  id: string;
  col: string;
  title?: string;
  content?: string;
  notebookId?: string | null;
  pinned?: boolean;
}): Promise<{ ok: true; updatedAt: string }> {
  await requireSuperAdmin();
  assertNoteCol(input.col);

  const now = new Date();
  const $set: Record<string, unknown> = { updatedAt: now };
  const $unset: Record<string, ""> = {};

  if (input.title !== undefined) $set.title = clean(input.title, 300) || "(بدون عنوان)";
  if (input.content !== undefined) $set.content = String(input.content).slice(0, 200_000);
  if (input.pinned !== undefined) $set.pinned = Boolean(input.pinned);
  if (input.notebookId !== undefined) {
    $set.notebookId = input.notebookId || null;
    // تنظيف أسماء الحقول القديمة حتى لا يبقى مرجعان متعارضان
    $unset.notebook = "";
    $unset.folderId = "";
    $unset.folder = "";
  }

  const update: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) update.$unset = $unset;

  const db = await getMylibraryDb();
  await db.collection(input.col).updateOne(idFilter(input.id), update);

  revalidatePath("/admin/notes");
  return { ok: true, updatedAt: now.toISOString() };
}

export async function deleteNoteAction(input: {
  id: string;
  col: string;
}): Promise<{ ok: true }> {
  await requireSuperAdmin();
  assertNoteCol(input.col);

  const db = await getMylibraryDb();
  await db.collection(input.col).deleteOne(idFilter(input.id));

  revalidatePath("/admin/notes");
  return { ok: true };
}
