// ثوابت ومساعدات قسم المحاضرات والدروس (Lectures)

export type LevelKey = "l1" | "l2" | "l3" | "m1" | "m2";
export type StudyLevelValue = "L1" | "L2" | "L3" | "M1" | "M2";

export const LEVELS: {
	key: LevelKey;
	value: StudyLevelValue;
	label: string;
	icon: string;
	isMaster: boolean;
}[] = [
	{ key: "l1", value: "L1", label: "ليسانس 1", icon: "🎓", isMaster: false },
	{ key: "l2", value: "L2", label: "ليسانس 2", icon: "🎓", isMaster: false },
	{ key: "l3", value: "L3", label: "ليسانس 3", icon: "🎓", isMaster: false },
	{ key: "m1", value: "M1", label: "ماستر 1", icon: "📖", isMaster: true },
	{ key: "m2", value: "M2", label: "ماستر 2", icon: "📖", isMaster: true },
];

export function levelFromParam(p: string) {
	return LEVELS.find((l) => l.key === p.toLowerCase()) ?? null;
}

export function levelByValue(v: string) {
	return LEVELS.find((l) => l.value === v) ?? null;
}

export const LECTURE_TYPES: { value: string; label: string; icon: string }[] =
	[
		{ value: "cours", label: "محاضرات", icon: "📕" },
		{ value: "td", label: "سلاسل TD", icon: "📝" },
		{ value: "tp", label: "أعمال تطبيقية TP", icon: "🧪" },
		{ value: "resume", label: "ملخصات", icon: "📋" },
		{ value: "book", label: "كتب ومراجع", icon: "📚" },
		{ value: "exam", label: "امتحانات سابقة", icon: "🎯" },
		{ value: "other", label: "ملفات أخرى", icon: "📦" },
	];

export function lectureType(value: string) {
	return (
		LECTURE_TYPES.find((t) => t.value === value) ??
		LECTURE_TYPES[LECTURE_TYPES.length - 1]
	);
}

export function fmtSize(bytes: number): string {
	if (bytes >= 1024 * 1024)
		return (bytes / (1024 * 1024)).toFixed(1) + " م.ب";
	if (bytes >= 1024) return Math.round(bytes / 1024) + " ك.ب";
	return bytes + " بايت";
}
