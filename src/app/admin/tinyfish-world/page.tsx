import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TinyFishWorldConsole } from "@/components/admin/tinyfish-world-console";
import { TINYFISH_WORLD_CAMPAIGNS } from "@/lib/tinyfish-world";

export const dynamic = "force-dynamic";

export default async function AdminTinyFishWorldPage() {
  if ((await auth())?.user?.role !== "SUPER_ADMIN") redirect("/admin");
  return (
    <main className="mx-auto max-w-3xl py-2" dir="rtl">
      <header className="border-b pb-4">
        <p className="text-[10px] font-semibold text-primary">
          TinyFish Search · Official PDFs
        </p>
        <h1 className="mt-1 text-base font-bold">
          🌍 توسيع الأرشيف العالمي
        </h1>
        <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">
          يبحث داخل النطاقات الجامعية الرسمية، يتحقق من توقيع PDF، يمنع
          التكرار، ثم ينسخ الاختبار إلى Azure وينشره في صفحة العالم.
        </p>
      </header>
      <div className="mt-5">
        <TinyFishWorldConsole
          configured={Boolean((process.env.TINYFISH_API_KEY || "").trim())}
          campaigns={TINYFISH_WORLD_CAMPAIGNS}
        />
      </div>
    </main>
  );
}