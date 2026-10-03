import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FessConsole } from "@/components/admin/fess-console";
import { getFessAdminOverview } from "@/lib/fess";

export const dynamic = "force-dynamic";

export default async function AdminPdfDiscoveryPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/admin");
  const overview = await getFessAdminOverview();

  return (
    <div className="mx-auto max-w-3xl py-2" dir="rtl">
      <header className="border-b pb-4">
        <p className="text-[10px] font-semibold text-primary">
          Fess · Azure Private Network
        </p>
        <h1 className="mt-1 text-base font-bold">🔎 اكتشاف ملفات PDF</h1>
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">
          إدارة الاتصال، تشغيل الزحف، واختبار الملفات المكتشفة مباشرة قبل
          عرضها للزوار.
        </p>
      </header>
      <div className="mt-5">
        <FessConsole initialOverview={overview} />
      </div>
    </div>
  );
}