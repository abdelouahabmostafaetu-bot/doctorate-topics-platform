// سجل المصادر — بترتيب التنفيذ الموصى به.

import { doabSource } from "./doab";
import { halSource } from "./hal";
import { springerMetaSource, springerOaSource } from "./springer";
import { zbmathSource } from "./zbmath";
import type { Source } from "../source";

export const SOURCES: Source[] = [
	zbmathSource, // 1) العمود الفقري — تصنيف MSC بشري موثوق لكل كتاب
	springerOaSource, // 2) كتب مفتوحة مع PDF
	doabSource, // 3) كتب محكّمة مفتوحة
	halSource, // 4) الكتب الفرنسية
	springerMetaSource, // 5) التوسع: بيانات وسلاسل
];

export function findSource(id: string): Source | undefined {
	return SOURCES.find((s) => s.id === id);
}

export { doabSource, halSource, springerMetaSource, springerOaSource, zbmathSource };
