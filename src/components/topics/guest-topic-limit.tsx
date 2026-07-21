import Image from "next/image";
import Link from "next/link";

export function GuestTopicLimit({ currentPath }: { currentPath: string }) {
  const callbackUrl = encodeURIComponent(currentPath);

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[72vh] w-full max-w-md items-center px-6 py-12"
    >
      <section className="w-full text-center">
        <Image
          src="/icon.png"
          alt="DocMath DZ"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 object-contain"
          priority
        />

        <p className="mt-4 text-xs font-bold tracking-wide text-primary">
          DocMath DZ
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          لقد أكملت المواضيع المجانية
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
          يمكنك كزائر قراءة ثلاثة مواضيع دكتوراه. للاستمرار في تصفح جميع
          المواضيع والحلول دون حدود، سجّل الدخول أو أنشئ حسابًا مجانيًا.
        </p>

        <div
          className="mt-6 flex items-center justify-center gap-2"
          aria-label="تمت قراءة 3 من 3 مواضيع"
        >
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
            >
              {step}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">3 من 3 مواضيع</p>

        <div className="mt-8 grid gap-3">
          <Link
            href={`/signin?reason=topic-limit&callbackUrl=${callbackUrl}`}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            تسجيل الدخول للاستمرار
          </Link>
          <Link
            href={`/signup?reason=topic-limit&callbackUrl=${callbackUrl}`}
            className="inline-flex w-full items-center justify-center rounded-full border border-primary/40 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary/10"
          >
            إنشاء حساب مجاني
          </Link>
        </div>

        <p className="mt-5 text-xs leading-6 text-muted-foreground">
          يمكنك الدخول باسم المستخدم وكلمة المرور أو بحساب Google.
        </p>
        <Link
          href="/search"
          className="mt-4 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          العودة إلى البحث
        </Link>
      </section>
    </main>
  );
}
