// اتصال قاعدة mylibrary (MongoDB القديمة) — يُستخدم حصريًا لميزة «ملاحظاتي» الخاصة بالمدير الأعلى
// يقرأ الدفاتر والملاحظات القديمة بأسماء حقول مرنة (title/name، content/body/text...)
// ويكتب الجديد بحقول موحّدة: { title, content, notebookId, pinned, createdAt, updatedAt }
import { MongoClient, ObjectId, type Db, type Document } from "mongodb";

// ===== الاتصال (Singleton — نفس نمط lib/prisma.ts) =====
const globalForMongo = globalThis as unknown as {
  mylibraryClient?: MongoClient;
};

export async function getMylibraryDb(): Promise<Db> {
  const url = process.env.DATABASE_URL_MYLIBRARY;
  if (!url) {
    throw new Error(
      "أضف DATABASE_URL_MYLIBRARY في .env (نفس رابط Cluster0 لكن باسم قاعدة mylibrary)",
    );
  }
  if (!globalForMongo.mylibraryClient) {
    globalForMongo.mylibraryClient = new MongoClient(url);
  }
  // سائق MongoDB v6 يتصل تلقائيًا عند أول عملية
  return globalForMongo.mylibraryClient.db();
}

// ===== أسماء المجموعات المرشّحة (الموقع القديم) =====
// يمكن تخصيصها عبر متغيري البيئة MYNOTES_NOTES_COLLECTION و MYNOTES_NOTEBOOKS_COLLECTION
const NOTE_CANDIDATES = ["notes", "note", "mynotes", "usernotes", "studynotes"];
const NOTEBOOK_CANDIDATES = ["notebooks", "notebook", "notefolders"];

export function noteCandidates(): string[] {
  const extra = process.env.MYNOTES_NOTES_COLLECTION?.trim();
  return extra
    ? [extra, ...NOTE_CANDIDATES.filter((c) => c !== extra)]
    : NOTE_CANDIDATES;
}

export function notebookCandidates(): string[] {
  const extra = process.env.MYNOTES_NOTEBOOKS_COLLECTION?.trim();
  return extra
    ? [extra, ...NOTEBOOK_CANDIDATES.filter((c) => c !== extra)]
    : NOTEBOOK_CANDIDATES;
}

export function isAllowedNoteCollection(name: string): boolean {
  return noteCandidates().includes(name);
}

export function isAllowedNotebookCollection(name: string): boolean {
  return notebookCandidates().includes(name);
}

// ===== الأنواع المُسلسَلة (تمر من الخادم إلى العميل) =====
export type MyNote = {
  id: string;
  /** اسم المجموعة التي يعيش فيها المستند (للتعديل/الحذف) */
  col: string;
  title: string;
  content: string;
  notebookId: string | null;
  pinned: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MyNotebook = {
  id: string;
  col: string;
  title: string;
  createdAt: string | null;
};

export type CollectionInfo = { name: string; count: number };

export type MyNotesData = {
  notebooks: MyNotebook[];
  notes: MyNote[];
  /** نظرة عامة على كل مجموعات mylibrary (لوحة الاستكشاف) */
  collections: CollectionInfo[];
  noteWriteCollection: string;
  notebookWriteCollection: string;
};

// ===== أدوات التطبيع =====
function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function toDateStr(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v && !Number.isNaN(Date.parse(v))) {
    return new Date(v).toISOString();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  return null;
}

/** يحول مرجع دفتر (ObjectId أو نص أو مستند مُضمَّن) إلى معرف نصي */
function refToId(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof ObjectId) return v.toHexString();
  if (typeof v === "string") return v || null;
  if (typeof v === "object" && "_id" in (v as Record<string, unknown>)) {
    return refToId((v as { _id: unknown })._id);
  }
  return null;
}

export function normalizeNote(d: Document, col: string): MyNote {
  const rawId = d._id;
  const id = rawId instanceof ObjectId ? rawId.toHexString() : String(rawId);
  const createdAt =
    toDateStr(d.createdAt) ??
    toDateStr(d.created_at) ??
    toDateStr(d.date) ??
    (rawId instanceof ObjectId ? rawId.getTimestamp().toISOString() : null);
  return {
    id,
    col,
    title: s(d.title) || s(d.name) || s(d.subject) || "(بدون عنوان)",
    content: s(d.content) || s(d.body) || s(d.text) || s(d.description) || "",
    notebookId: refToId(
      d.notebookId ?? d.notebook ?? d.folderId ?? d.folder ?? null,
    ),
    pinned: Boolean(d.pinned ?? d.isPinned ?? false),
    createdAt,
    updatedAt: toDateStr(d.updatedAt) ?? toDateStr(d.updated_at) ?? createdAt,
  };
}

export function normalizeNotebook(d: Document, col: string): MyNotebook {
  const rawId = d._id;
  const id = rawId instanceof ObjectId ? rawId.toHexString() : String(rawId);
  return {
    id,
    col,
    title: s(d.title) || s(d.name) || "(دفتر بدون اسم)",
    createdAt:
      toDateStr(d.createdAt) ??
      toDateStr(d.created_at) ??
      (rawId instanceof ObjectId ? rawId.getTimestamp().toISOString() : null),
  };
}

/** فلتر _id يقبل ObjectId أو معرفًا نصيًا قديمًا */
export function idFilter(id: string): Document {
  return ObjectId.isValid(id)
    ? { _id: new ObjectId(id) }
    : ({ _id: id } as unknown as Document);
}

/** فلتر «كل الملاحظات التي تنتمي إلى هذا الدفتر» بكل أسماء الحقول القديمة */
export function notebookRefFilter(notebookId: string): Document {
  const values: unknown[] = [notebookId];
  if (ObjectId.isValid(notebookId)) values.push(new ObjectId(notebookId));
  const fields = ["notebookId", "notebook", "folderId", "folder"];
  return {
    $or: fields.flatMap((f) => values.map((v) => ({ [f]: v }))),
  } as Document;
}

// ===== التحميل الكامل (يُستدعى من صفحة /admin/notes) =====
export async function loadMyNotesData(): Promise<MyNotesData> {
  const db = await getMylibraryDb();
  const infos = await db.listCollections().toArray();
  const existing = infos.map((c) => c.name);

  // نظرة عامة على القاعدة — تساعدك على معرفة أين توجد بياناتك القديمة
  const collections: CollectionInfo[] = [];
  for (const name of existing) {
    if (name.startsWith("system.")) continue;
    const count = await db.collection(name).estimatedDocumentCount();
    collections.push({ name, count });
  }
  collections.sort((a, b) => a.name.localeCompare(b.name));

  const nbCols = notebookCandidates().filter((c) => existing.includes(c));
  const nCols = noteCandidates().filter((c) => existing.includes(c));

  const notebooks: MyNotebook[] = [];
  for (const col of nbCols) {
    const docs = await db.collection(col).find({}).toArray();
    for (const d of docs) notebooks.push(normalizeNotebook(d, col));
  }

  const notes: MyNote[] = [];
  for (const col of nCols) {
    const docs = await db.collection(col).find({}).toArray();
    for (const d of docs) notes.push(normalizeNote(d, col));
  }
  // الأحدث تعديلًا أولًا
  notes.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

  return {
    notebooks,
    notes,
    collections,
    notebookWriteCollection: nbCols[0] ?? notebookCandidates()[0],
    noteWriteCollection: nCols[0] ?? noteCandidates()[0],
  };
}
