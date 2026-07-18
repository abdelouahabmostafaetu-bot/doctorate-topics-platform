import type { Metadata } from "next";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export const metadata: Metadata = {
  title: "📱 حمّل التطبيق",
  description:
    "ثبّت تطبيق DocMath DZ على هاتفك أو حاسوبك — مواضيع مسابقات دكتوراه الرياضيات دائمًا في جيبك.",
};

// رابط ملف APK — ضع ملف app-release-signed.apk في مجلد public،
// أو استبدل الرابط برابط GitHub Releases الخاص بك
const APK_URL = "/app-release-signed.apk";

export default function AppPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* المقدمة */}
      <div className="text-center">
        <span className="text-5xl">📱</span>
        <h1 className="mt-4 text-3xl font-bold">حمّل تطبيق DocMath DZ</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          نفس المنصة تمامًا — بأيقونة على جهازك، فتح أسرع، وبدون شريط المتصفح.
          ويتحدّث تلقائيًا مع كل جديد في الموقع.
        </p>
      </div>

      {/* طريقتا التثبيت */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {/* PWA */}
        <div className="flex flex-col rounded-2xl border p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-semibold">التثبيت الفوري</h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              موصى به
            </span>
          </div>
          <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
            <li>✓ يعمل على Android وiPhone والحاسوب</li>
            <li>✓ بدون تحميل ملفات — ثوانٍ معدودة</li>
            <li>✓ تحديثات تلقائية دائمًا</li>
            <li>✓ مساحة شبه معدومة</li>
          </ul>
          <div className="mt-4">
            <InstallAppButton />
          </div>
        </div>

        {/* APK */}
        <div className="flex flex-col rounded-2xl border p-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-semibold">ملف APK لأندرويد</h2>
          </div>
          <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
            <li>✓ تطبيق Android أصلي كامل</li>
            <li>✓ مناسب لمن يفضل التثبيت اليدوي</li>
            <li>✓ يعرض أحدث نسخة من المنصة تلقائيًا</li>
          </ul>
          <div className="mt-4">
            <a
              href={APK_URL}
              download
              className="block w-full rounded-md border-2 border-primary px-4 py-2 text-center text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              ⬇️ تحميل APK
            </a>
          </div>
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium hover:text-primary">
              خطوات التثبيت
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pr-5 leading-6">
              <li>حمّل الملف ثم افتحه من الإشعارات أو مجلد التنزيلات</li>
              <li>إن طُلب منك، فعّل «التثبيت من مصادر غير معروفة» لمتصفحك</li>
              <li>اضغط «تثبيت» — وستجد الأيقونة على شاشتك 🎓</li>
            </ol>
          </details>
        </div>
      </div>

      {/* طمأنة */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        🔒 التطبيق مجاني بالكامل، بدون إعلانات، ولا يطلب أي أذونات خاصة —
        ومحتواه يتحدّث مباشرة من الموقع.
      </p>
    </div>
  );
}
