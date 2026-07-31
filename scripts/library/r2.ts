// ملغى — استُبدل بـ scripts/library/storage.ts الذي يدعم Azure وR2 معًا.
// مُبقى مؤقتًا لتجنّب كسر أي استيراد قديم؛ يُحذف بعد الدمج.

export { extensionFor, mirrorToStorage as mirrorToR2, storageConfigured } from "./storage";
