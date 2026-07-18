import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description:
    "سياسة الخصوصية لمنصة DocMath DZ — ما البيانات التي نجمعها وكيف نستخدمها.",
};

// صفحة سياسة الخصوصية — مطلوبة للنشر على Google Play
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        آخر تحديث: جويلية 2026
      </p>

      <div className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold">من نحن</h2>
          <p className="mt-2 text-muted-foreground">
            DocMath DZ منصة مجانية غير ربحية تأرشف مواضيع مسابقات الالتحاق
            بالدكتوراه في الرياضيات بالجزائر، وتساعد الطلبة على المراجعة
            والتحضير.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">البيانات التي نجمعها</h2>
          <ul className="mt-2 list-disc space-y-2 pr-5 text-muted-foreground">
            <li>
              <strong>التصفح بدون حساب:</strong> لا نجمع أي بيانات شخصية. تُحفظ
              تفضيلاتك (مثل الوضع الداكن وتقدم المراجعة المحلي) في متصفحك فقط
              ولا تُرسل إلينا.
            </li>
            <li>
              <strong>عند تسجيل الدخول:</strong> نحفظ الاسم والبريد الإلكتروني
              وصورة الحساب التي يوفرها مزود تسجيل الدخول، مع تقدمك في المراجعة
              ومفضلاتك ومساهماتك.
            </li>
            <li>
              <strong>إحصاءات مجهولة:</strong> نستخدم تحليلات لا تتعقب الهوية
              (Vercel Analytics) لفهم الاستخدام وتحسين المنصة.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">كيف نستخدم البيانات</h2>
          <ul className="mt-2 list-disc space-y-2 pr-5 text-muted-foreground">
            <li>تشغيل ميزات حسابك: المفضلة، تتبع المراجعة، والمساهمات.</li>
            <li>إظهار اسمك في لوحة المساهمين إن ساهمت.</li>
            <li>
              لا نبيع ولا نشارك بياناتك مع أي طرف ثالث لأغراض تجارية، ولا نعرض
              إعلانات.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">حقوقك</h2>
          <p className="mt-2 text-muted-foreground">
            يمكنك طلب حذف حسابك وكل بياناتك في أي وقت بمراسلتنا عبر البريد
            أدناه، وسنستجيب في أقرب وقت ممكن.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">تواصل معنا</h2>
          <p className="mt-2 text-muted-foreground">
            لأي سؤال حول الخصوصية:{" "}
            <a
              href="mailto:edumoustapha60@gmail.com"
              className="text-primary hover:underline"
            >
              edumoustapha60@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
