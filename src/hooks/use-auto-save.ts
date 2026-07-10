"use client";

// Hook واحد للحفظ التلقائي (Auto Save) — يغطي كل النماذج (FR-601 → FR-607)
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteDraftAction,
  loadDraftAction,
  saveDraftAction,
} from "@/app/actions/drafts";

export type SaveStatus = "idle" | "saving" | "saved" | "offline";

export type DraftSnapshot<T> = { data: T; savedAt: string };

const DEBOUNCE_MS = 3000; // FR-602: حفظ كل 3 ثوانٍ كحد أقصى بعد آخر تغيير

function localKey(formId: string) {
  return `autosave:${formId}`;
}

function readLocal<T>(formId: string): DraftSnapshot<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localKey(formId));
    return raw ? (JSON.parse(raw) as DraftSnapshot<T>) : null;
  } catch {
    return null;
  }
}

function writeLocal<T>(formId: string, snapshot: DraftSnapshot<T>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(localKey(formId), JSON.stringify(snapshot));
  } catch {
    // نتجاهل (مثلاً مساحة التخزين المحلي ممتلئة) — النسخة على الخادم تكفي
  }
}

function clearLocal(formId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(localKey(formId));
}

export function useAutoSave<T>({
  formId,
  isLoggedIn,
}: {
  formId: string;
  isLoggedIn: boolean;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [restoreAvailable, setRestoreAvailable] =
    useState<DraftSnapshot<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // عند التحميل: نبحث عن مسودة محلية أو مسودة على الخادم (FR-604)
  useEffect(() => {
    let cancelled = false;
    async function checkExistingDraft() {
      const local = readLocal<T>(formId);
      let remote: DraftSnapshot<T> | null = null;
      if (isLoggedIn) {
        try {
          const r = await loadDraftAction(formId);
          if (r) remote = { data: r.data as T, savedAt: r.savedAt };
        } catch {
          remote = null;
        }
      }
      if (cancelled) return;
      const candidate =
        local && remote
          ? new Date(local.savedAt) > new Date(remote.savedAt)
            ? local
            : remote
          : (local ?? remote);
      if (candidate) setRestoreAvailable(candidate);
    }
    checkExistingDraft();
    return () => {
      cancelled = true;
    };
  }, [formId, isLoggedIn]);

  const scheduleSave = useCallback(
    (data: T) => {
      const offline = typeof window !== "undefined" && !window.navigator.onLine;
      setStatus(offline ? "offline" : "saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const savedAt = new Date().toISOString();
        writeLocal(formId, { data, savedAt }); // FR-602: يعمل حتى بدون إنترنت
        const stillOffline =
          typeof window !== "undefined" && !window.navigator.onLine;
        if (stillOffline) {
          setStatus("offline");
          return;
        }
        if (isLoggedIn) {
          try {
            // FR-603: مزامنة مع الخادم للمستخدمين المسجّلين فقط
            await saveDraftAction(formId, data as Record<string, unknown>);
          } catch {
            // النسخة المحلية محفوظة على أي حال
          }
        }
        setStatus("saved");
      }, DEBOUNCE_MS);
    },
    [formId, isLoggedIn],
  );

  // FR-607: تُحذف المسودة تلقائيًا بعد الإرسال الناجح للنموذج
  const clearDraft = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearLocal(formId);
    setRestoreAvailable(null);
    setStatus("idle");
    if (isLoggedIn) {
      try {
        await deleteDraftAction(formId);
      } catch {
        // تجاهل
      }
    }
  }, [formId, isLoggedIn]);

  const dismissRestore = useCallback(() => setRestoreAvailable(null), []);

  return {
    status,
    scheduleSave,
    clearDraft,
    restoreAvailable,
    dismissRestore,
  };
}
