import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopicCard } from "@/components/topic-card";
import { AutoSaveFormWrapper } from "@/components/admin/auto-save-form-wrapper";
import { updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحتي الشخصية — منصة مواضيع دكتوراه الرياضيات",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const user = session.user;
  const userId = user.id;
  if (!userId) redirect("/signin");

  // المواضيع المحفوظة — الأحدث أولًا (v2)
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const favoriteTopics = favorites.length
    ? await prisma.topic.findMany({
        where: {
          id: { in: favorites.map((f) => f.topicId) },
          status: "published",
        },
        include: { university: true, specialty: true },
      })
    : [];
  const orderedTopics = favorites
    .map((f) => favoriteTopics.find((t) => t.id === f.topicId))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold">لوحتي الشخصية 👤</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        أهلًا {user.name ?? user.email} 👋
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* المواضيع المحفوظة */}
        <section className="lg:col-span-2">
          <h2 className="font-semibold">
            ⭐ مواضيعي المحفوظة ({orderedTopics.length})
          </h2>
          {orderedTopics.length === 0 ? (
            <div className="mt-4 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              لم تحفظ أي موضوع بعد — افتح أي موضوع واضغط “☆ حفظ الموضوع”
              <div className="mt-3">
                <Link href="/search" className="text-primary hover:underline">
                  تصفّح المواضيع ←
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {orderedTopics.map((t) => (
                <TopicCard key={t.id} topic={t} />
              ))}
            </div>
          )}
        </section>

        {/* الملف الشخصي */}
        <section className="h-fit rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">الملف الشخصي</h2>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {user.email}
          </p>
          <div className="mt-4">
            <AutoSaveFormWrapper
              formId="account-profile"
              isLoggedIn
              action={updateProfileAction}
              className="space-y-4"
            >
              <label className="block text-sm">
                الاسم
                <input
                  name="name"
                  defaultValue={user.name ?? ""}
                  dir="auto"
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                حفظ
              </button>
            </AutoSaveFormWrapper>
          </div>
        </section>
      </div>
    </div>
  );
}
