import Link from "next/link";
import { notFound } from "next/navigation";
import { recordClosedPageView } from "@/lib/private-access/inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "الموقع مغلق مؤقتًا", robots: { index: false, follow: false } };

export default async function PrivateClosed() {
  if (process.env.PRIVATE_SITE_MODE !== "true") notFound();
  await recordClosedPageView();
  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center" dir="rtl">
      <p className="text-sm font-semibold text-blue-700">DOCMATH DZ</p>
      <h1 className="mt-4 text-3xl font-bold">الموقع مغلق مؤقتًا</h1>
      <p className="mt-4 leading-8 text-muted-foreground">نعمل حاليًا على تطوير الموقع. يمكنك مراسلة الإدارة وسنرد عليك عبر البريد الإلكتروني.</p>
      <Link className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-6 font-semibold text-white hover:bg-blue-800" href="/private/contact">مراسلة الإدارة</Link>
    </section>
  );
}
