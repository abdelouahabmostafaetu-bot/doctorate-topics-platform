// تخزين مكتبة المواضيع في IndexedDB — للقراءة بدون إنترنت
// (سعة IndexedDB كبيرة، بعكس localStorage المحدود بـ 5MB)

export type OfflineProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  statement: string;
  solution?: string | null;
  remark?: string | null;
  hasSolution: boolean;
};

export type OfflineTopic = {
  slug: string;
  title: string;
  year: number;
  examType: string;
  examNumber?: number | null;
  durationMinutes?: number | null;
  university: { name: string; nameAr: string };
  specialty: { name: string; nameAr: string };
  problems: OfflineProblem[];
};

export type OfflineLibraryData = {
  savedAt: string;
  count: number;
  topics: OfflineTopic[];
};

const DB_NAME = "docmath-offline";
const STORE = "library";
const KEY = "topics";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLibrary(lib: OfflineLibraryData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(lib, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadLibrary(): Promise<OfflineLibraryData | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as OfflineLibraryData | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteLibrary(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
