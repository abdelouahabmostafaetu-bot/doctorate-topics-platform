// إدارة المحاضرات والدروس — إنشاء الموديلات ورفع الملفات (للمشرفين)
import { prisma } from "@/lib/prisma";
import { LectureUploadForm } from "@/components/admin/lecture-upload-form";
import { LEVELS, levelByValue, lectureType, fmtSize } from "@/lib/lectures";
import { createModule, deleteModule, deleteResource } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLecturesPage() {
	const [universities, specialties, modules] = await Promise.all([
		prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
		prisma.specialty.findMany({ orderBy: { name: "asc" } }),
		prisma.module.findMany({
			include: {
				university: true,
				specialty: true,
				resources: { orderBy: { createdAt: "desc" } },
			},
			orderBy: [{ level: "asc" }, { semester: "asc" }, { name: "asc" }],
		}),
	]);

	const moduleOptions = modules.map((m) => ({
		id: m.id,
		label:
			m.university.nameAr +
			" · " +
			(levelByValue(m.level)?.label ?? m.level) +
			" · S" +
			m.semester +
			(m.specialty ? " · " + m.specialty.name : "") +
			" · " +
			m.name,
	}));

	return (
		<div className="space-y-6 py-4">
			<h2 className="text-lg font-bold">📚 المحاضرات والدروس</h2>

			{/* إنشاء موديل */}
			<section className="rounded-xl border bg-card p-4">
				<h3 className="mb-3 text-sm font-bold">➕ إنشاء موديل (مقياس) جديد</h3>
				<form action={createModule} className="grid gap-3 sm:grid-cols-3">
					<label className="block text-xs">
						اسم الموديل
						<input
							name="name"
							required
							maxLength={120}
							placeholder="Analyse Fonctionnelle"
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						/>
					</label>
					<label className="block text-xs">
						الجامعة
						<select
							name="universityId"
							required
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							<option value="">— اختر —</option>
							{universities.map((u) => (
								<option key={u.id} value={u.id}>
									{u.nameAr}
								</option>
							))}
						</select>
					</label>
					<label className="block text-xs">
						المستوى
						<select
							name="level"
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							{LEVELS.map((l) => (
								<option key={l.value} value={l.value}>
									{l.label}
								</option>
							))}
						</select>
					</label>
					<label className="block text-xs">
						التخصص (للماستر فقط)
						<select
							name="specialtyId"
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							<option value="">— بدون (ليسانس) —</option>
							{specialties.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</label>
					<label className="block text-xs">
						السداسي
						<select
							name="semester"
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						>
							<option value="1">السداسي 1</option>
							<option value="2">السداسي 2</option>
						</select>
					</label>
					<label className="block text-xs">
						المعامل (اختياري)
						<input
							name="coefficient"
							type="number"
							min={1}
							max={10}
							className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
						/>
					</label>
					<div className="sm:col-span-3">
						<button
							type="submit"
							className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
						>
							➕ إنشاء الموديل
						</button>
					</div>
				</form>
			</section>

			{/* رفع ملف */}
			<section className="rounded-xl border bg-card p-4">
				<h3 className="mb-3 text-sm font-bold">📤 رفع ملف جديد</h3>
				{moduleOptions.length === 0 ? (
					<p className="text-xs text-muted-foreground">
						أنشئ موديلًا أولًا ثم ارفع الملفات إليه.
					</p>
				) : (
					<LectureUploadForm modules={moduleOptions} />
				)}
			</section>

			{/* قائمة الموديلات والملفات */}
			<section className="space-y-3">
				<h3 className="text-sm font-bold">
					🗂️ الموديلات ({modules.length})
				</h3>
				{modules.map((m) => (
					<details key={m.id} className="rounded-xl border bg-card p-3">
						<summary className="cursor-pointer text-sm font-medium">
							{m.university.nameAr} · {levelByValue(m.level)?.label ?? m.level}{" "}
							· S{m.semester}
							{m.specialty ? " · " + m.specialty.name : ""} · {m.name} —{" "}
							{m.resources.length} ملف
						</summary>
						<div className="mt-3 space-y-2">
							{m.resources.map((r) => (
								<div
									key={r.id}
									className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
								>
									<span>
										{lectureType(r.type).icon} {r.title} ·{" "}
										{fmtSize(r.fileSizeBytes)} · ⬇️ {r.downloadsCount}
									</span>
									<form action={deleteResource}>
										<input type="hidden" name="id" value={r.id} />
										<button
											type="submit"
											className="text-red-600 hover:underline"
										>
											🗑️ حذف
										</button>
									</form>
								</div>
							))}
							<form action={deleteModule}>
								<input type="hidden" name="id" value={m.id} />
								<button
									type="submit"
									className="text-xs text-red-600 hover:underline"
								>
									🗑️ حذف الموديل وكل ملفاته
								</button>
							</form>
						</div>
					</details>
				))}
			</section>
		</div>
	);
}
