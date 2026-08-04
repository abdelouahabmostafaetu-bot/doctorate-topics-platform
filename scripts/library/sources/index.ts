// سجل المصادر — بترتيب التنفيذ الموصى به.

import { doabSource } from "./doab";
import { halSource } from "./hal";
import { springerMetaSource, springerOaSource } from "./springer";
import type { Source } from "../source";

export const SOURCES: Source[] = [
	springerOaSource, // 1) كتب مفتوحة مع PDF
	doabSource, // 2) 86,000 كتاب محكّم مفتوح
	halSource, // 3) الكتب الفرنسية
	springerMetaSource, // 4) التوسع: بيانات وسلاسل
];

export function findSource(id: string): Source | undefined {
	return SOURCES.find((s) => s.id === id);
}

export { doabSource, halSource, springerMetaSource, springerOaSource };
