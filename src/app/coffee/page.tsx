import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import { CopyCcp } from "@/components/copy-ccp";

// خط عربي كلاسيكي جميل خاص بهذه الصفحة
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "قهوة الدكتوراه ☕ — ادعم المنصة",
  description:
    "منصة مجانية لأرشفة مواضيع مسابقات الدكتوراه في الرياضيات — يمكنك دعم استمرارها بثمن كوب قهوة.",
};

const CCP_RAW = "00799999002781033371";
const CCP_DISPLAY = "0079 9999 0027 8103 3371";

export default function CoffeePage() {
  return (
    <main className={amiri.className + " mx-auto max-w-2xl px-4 py-12"}>
      <header className="text-center">
        <div className="text-5xl">☕</div>
        <h1 className="mt-3 text-2xl font-bold">قهوة الدكتوراه</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          دعمك البسيط يُبقي هذه المنصة حيّة ومجانية للجميع
        </p>
      </header>

      <div className="mx-auto my-8 h-px w-28 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

      <section className="space-y-5 text-justify text-[15px] leading-9 text-foreground/90">
        <p>السلام عليكم ورحمة الله،</p>
        <p>
          خلفَ هذه المنصة طالبُ ماستر في الرياضيات، خاض مسابقات الدكتوراه ولم
          يحالفه الحظ بعد. وبدل أن تضيع سنواتُ البحث وجمع المواضيع، قرّرتُ أن
          أحوّلها — مع ما أملك من وقتٍ ومهاراتٍ في البرمجة — إلى مشروع مفتوح
          يخدم كلَّ طالبٍ يحضّر للمسابقة، حتى لا يتعب في البحث عن المواضيع كما
          تعبت.
        </p>
        <p>
          شكرٌ خاص لصديقي <b>علي بن الشيخ</b>، الذي أرسل لي أكبر مجموعة مواضيع
          في مكتبته، فكان لمساهمته أثرٌ كبير في إثراء هذا الأرشيف.
        </p>
        <p>
          المنصة مجانية وستبقى كذلك دائمًا، لكن خلفها تكاليف حقيقية: استضافة،
          ونطاق، وساعاتٌ طويلة من التطوير والصيانة. إن وجدتَ فيها فائدة وأحببتَ
          أن تساهم في استمرارها وتطويرها، يكفيني منك ثمنُ كوب قهوة ☕
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-md rounded-xl border border-amber-300/60 bg-amber-50/50 p-5 text-center dark:border-amber-700/40 dark:bg-amber-950/20">
        <p className="text-xs text-muted-foreground">
          الحساب البريدي الجاري — CCP
        </p>
        <p dir="ltr" className="mt-2 font-mono text-lg tracking-widest">
          {CCP_DISPLAY}
        </p>
        <div className="mt-3 flex justify-center">
          <CopyCcp value={CCP_RAW} />
        </div>
      </div>

      <p className="mt-8 text-center text-sm leading-8 text-muted-foreground">
        وإن لم تستطع، فدعوةٌ صادقةٌ بالتوفيق تكفيني،
        <br />
        ومشاركةُ الموقع مع زملائك أجملُ دعم. 🌱
      </p>
    </main>
  );
}
