"use client";

// نموذج إنشاء حساب: حقول بخط سفلي فقط — بدون صناديق
import { useActionState, useEffect, useState } from "react";
import { registerAction, type SignupFormState } from "@/app/signup/actions";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

const initialState: SignupFormState = {};

const TURNSTILE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
);

export function SignupForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  // رمز Turnstile الحالي — يبقى زر الإرسال معطّلًا حتى يصدر
  const [humanToken, setHumanToken] = useState<string | null>(null);

  // رموز Turnstile أحادية الاستعمال — صفّر الودجت بعد كل محاولة فاشلة
  // وإلا أرسلت المحاولة التالية رمزًا مستهلَكًا فيرفضه Cloudflare دائمًا
  useEffect(() => {
    if (!state.error) return;
    setHumanToken(null);
    const w = window as unknown as { turnstile?: { reset: () => void } };
    w.turnstile?.reset();
  }, [state.error]);

  const waitingForToken = TURNSTILE_ENABLED && !humanToken;

  return (
    <form action={formAction} className="w-full space-y-6 text-right">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.error && (
        <p className="text-center text-xs text-destructive">{state.error}</p>
      )}

      <label className="block text-xs font-semibold text-muted-foreground">
        اسم المستخدم
        <input
          name="username"
          dir="ltr"
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
          placeholder="username"
          className="mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary"
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          3–20 حرفًا لاتينيًا أو أرقامًا — بدون مسافات
        </span>
      </label>

      <label className="block text-xs font-semibold text-muted-foreground">
        كلمة المرور
        <input
          name="password"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      <label className="block text-xs font-semibold text-muted-foreground">
        تأكيد كلمة المرور
        <input
          name="confirmPassword"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      <fieldset>
        <legend className="text-xs font-semibold text-muted-foreground">
          صفتك
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:font-semibold">
            <input
              type="radio"
              name="userType"
              value="student"
              defaultChecked
              className="accent-[hsl(var(--primary))]"
            />
            طالب
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:font-semibold">
            <input
              type="radio"
              name="userType"
              value="teacher"
              className="accent-[hsl(var(--primary))]"
            />
            أستاذ
          </label>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="agree"
          required
          className="accent-[hsl(var(--primary))]"
        />
        أوافق على شروط الاستخدام
      </label>

      {/* تحقق Cloudflare Turnstile — لا يظهر إلا بعد ضبط مفاتيحه */}
      <TurnstileWidget onTokenChange={setHumanToken} />

      <button
        type="submit"
        disabled={pending || waitingForToken}
        className="w-full rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "جارٍ إنشاء الحساب…"
          : waitingForToken
            ? "جارٍ التحقق من أنك إنسان…"
            : "إنشاء الحساب"}
      </button>
    </form>
  );
}
