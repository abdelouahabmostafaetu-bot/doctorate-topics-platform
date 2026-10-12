// إعلان دورة الطبولوجيا — بطاقة هادئة مدمجة في الصفحة الرئيسية (بدون نوافذ منبثقة ولا حركة مزعجة)
const WHATSAPP_URL =
  "https://wa.me/213559150549?text=" +
  encodeURIComponent("السلام عليكم، أريد الاستفسار عن دورة الطبولوجيا");
const FACEBOOK_URL = "https://www.facebook.com/share/1DfBtUf5bt/";

const features = [
  { icon: "🎥", title: "حصص مباشرة", text: "دروس تفاعلية عبر Zoom" },
  { icon: "🎬", title: "تسجيلات كاملة", text: "كل الدروس متاحة عبر Telegram" },
  { icon: "💬", title: "فضاء للنقاش", text: "أسئلة ومتابعة للتمارين عبر Telegram" },
  { icon: "🎯", title: "تحضير للمسابقات", text: "أساس متين ومهارة في حلّ المسائل" },
];

export function TopologyCourseAd() {
  return (
    <section
      dir="rtl"
      aria-label="إعلان: دورة الطبولوجيا"
      className="relative mt-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card sm:mt-14"
    >
      {/* شريط علوي رفيع بلون المنصة */}
      <div className="h-1 w-full bg-gradient-to-l from-[#163a70] via-[#274f96] to-[#d4af37]" />


      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_17rem] md:gap-8">
        {/* المحتوى */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#d4af37]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#8a6d12] dark:text-[#e6c65a]">
              إعلان · دورة
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              التسجيل مفتوح
            </span>
          </div>

          <h2 className="mt-3 text-xl font-bold leading-relaxed text-[#163a70] dark:text-foreground sm:text-2xl">
            📐 دورة الطبولوجيا: من الفهم إلى حلّ المسائل
          </h2>

          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            <span className="font-semibold text-foreground">🎓 لمن؟ </span>
            طلبة السنة الثانية جامعي وما بعدها، المقبلون على مسابقات الدكتوراه،
            وطلبة التحليل الدالي والهندسة التفاضلية وغيرها من المقاييس التي
            تعتمد على الطبولوجيا.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-border dark:bg-muted/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm dark:bg-background">
                  {f.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{f.title}</span>
                  <span className="block text-xs leading-6 text-muted-foreground">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* الكتاب المجاني + التسجيل */}
        <aside className="flex flex-col justify-between gap-5 rounded-xl bg-gradient-to-br from-[#163a70] to-[#274f96] p-5 text-white">
          <div>
            <p className="text-[11px] font-semibold text-[#d4af37]">🎁 هدية مع الدورة</p>
            <p
              className="mt-2 text-base font-bold leading-snug"
              dir="ltr"
              style={{ textAlign: "right" }}
            >
              Problems and Solutions in TOPOLOGY
            </p>
            <p className="mt-1 text-xs text-white/75" dir="ltr" style={{ textAlign: "right" }}>
              Abderrahmane Belkacem
            </p>
            <p className="mt-3 text-xs leading-6 text-white/85">
              كتاب مجاني يضم أكثر من 300 تمرين، معظمها مع الحلول، إضافة إلى
              ملخصات وتعريفات ورسوم توضيحية.
            </p>
          </div>

          <div className="space-y-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              <span aria-hidden>📱</span>
              سجّل عبر WhatsApp
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <span aria-hidden>💬</span>
              راسلنا على Facebook
            </a>
            <p className="pt-1 text-center text-xs text-white/70" dir="ltr">
              0559 15 05 49
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
