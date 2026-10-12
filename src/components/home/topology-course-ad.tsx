// إعلان دورة الطبولوجيا — بطاقة صغيرة أنيقة وبسيطة في الصفحة الرئيسية
const WHATSAPP_URL =
  "https://wa.me/213559150549?text=" +
  encodeURIComponent("السلام عليكم، أريد الاستفسار عن دورة الطبولوجيا");
const FACEBOOK_URL = "https://www.facebook.com/share/1DfBtUf5bt/";

const features = [
  "حصص مباشرة عبر Zoom",
  "تسجيلات كاملة عبر Telegram",
  "كتاب مجاني بأكثر من 300 تمرين",
  "متابعة ونقاش للتمارين",
];

export function TopologyCourseAd() {
  return (
    <section
      dir="rtl"
      aria-label="إعلان: دورة الطبولوجيا"
      className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3.5 dark:border-border dark:bg-card/60 sm:px-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-wide text-[#b8962e]">
            إعلان · التسجيل مفتوح
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-foreground sm:text-[15px]">
            دورة الطبولوجيا: من الفهم إلى حلّ المسائل
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            لطلبة السنة الثانية جامعي فما فوق، والمقبلين على مسابقات الدكتوراه.
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#b8962e]" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#163a70] px-3.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-[#1e4a8f] dark:bg-primary"
          >
            سجّل عبر WhatsApp
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-300 px-3.5 py-1.5 text-[11px] font-medium text-foreground/80 transition hover:border-slate-400 hover:text-foreground dark:border-border"
          >
            Facebook
          </a>
        </div>
      </div>
    </section>
  );
}
