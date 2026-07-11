import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContributionForm } from "@/components/contribute/contribution-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ساهم معنا — منصة مواضيع دكتوراه الرياضيات",
};

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/contribute");
  }

  const sp = await searchParams;
  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.specialty.findMany({ orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">ساهم معنا 🌱</h1>
      <p className="mt-2 text-muted-foreground">
        أرسل موضوع مسابقة (LaTeX أو PDF). بعد مراجعة المدير يُنشر على الموقع وتُحسب لك النقاط.
      </p>

      {sp.submitted === "1" && (
        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          ✅ تم إرسال مساهمتك بنجاح. ستظهر بعد المراجعة.
        </div>
      )}

      <div className="mt-8">
        <ContributionForm
          universities={universities.map((u) => ({
            id: u.id,
            name: u.name,
            nameAr: u.nameAr,
          }))}
          specialties={specialties.map((s) => ({
            id: s.id,
            name: s.name,
            nameAr: s.nameAr,
          }))}
        />
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/latex-guide" className="text-primary hover:underline">
          📖 دليل كتابة LaTeX
        </Link>
      </p>
    </div>
  );
}
