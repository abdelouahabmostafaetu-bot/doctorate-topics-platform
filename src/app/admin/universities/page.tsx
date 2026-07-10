import { prisma } from "@/lib/prisma";
import { addUniversityAction, updateUniversityAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUniversitiesPage() {
  const [universities, counts] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" } }),
    prisma.topic.groupBy({ by: ["universityId"], _count: { _all: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.universityId, c._count._all]));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">
          الجامعات ({universities.length})
        </h2>
        <div className="mt-4 space-y-3">
          {universities.map((u) => (
            <form
              key={u.id}
              action={updateUniversityAction}
              className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3"
            >
              <input type="hidden" name="id" value={u.id} />
              <span
                className="w-40 truncate text-xs text-muted-foreground"
                dir="ltr"
              >
                {u.name}
              </span>
              <input
                name="nameAr"
                defaultValue={u.nameAr}
                dir="rtl"
                className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
              />
              <input
                name="city"
                defaultValue={u.city ?? ""}
                placeholder="المدينة"
                dir="rtl"
                className="w-32 rounded-md border bg-background px-2 py-1 text-sm"
              />
              <span className="text-xs text-muted-foreground">
                {countMap.get(u.id) ?? 0} موضوع
              </span>
              <button
                type="submit"
                className="rounded-md border px-3 py-1 text-xs transition hover:border-primary hover:text-primary"
              >
                حفظ
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">إضافة جامعة جديدة</h3>
        <form
          action={addUniversityAction}
          className="mt-3 grid gap-3 sm:grid-cols-2"
        >
          <input
            name="name"
            placeholder="الاسم بالفرنسية (مثال: Université de Blida)"
            dir="ltr"
            required
            className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="nameAr"
            placeholder="الاسم بالعربية"
            dir="rtl"
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="slug (مثال: blida-2)"
            dir="ltr"
            required
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            name="city"
            placeholder="المدينة (اختياري)"
            dir="rtl"
            className="rounded-md border bg-background px-3 py-2 text-sm sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              إضافة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
