"use client";

// نموذج تسجيل الدخول: حقول بخط سفلي فقط — بدون صناديق
import { useActionState, useEffect, useState } from "react";
import { loginAction, type AuthFormState } from "@/app/signin/actions";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";

const initialState: AuthFormState = {};

const TURNSTILE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
);

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
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
          autoComplete="username"
          placeholder="username"
          className="mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      <label className="block text-xs font-semibold text-muted-foreground">
        كلمة المرور
        <input
          name="password"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full border-0 border-b bg-transparent px-0 py-2 text-sm font-normal text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      {/* تحقق Cloudflare Turnstile — لا يظهر إلا بعد ضبط مفاتيحه */}
      <TurnstileWidget onTokenChange={setHumanToken} />

      <button
        type="submit"
        disabled={pending || waitingForToken}
        className="w-full rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "جارٍ الدخول…"
          : waitingForToken
            ? "جارٍ التحقق من أنك إنسان…"
            : "تسجيل الدخول"}
      </button>
    </form>
  );
}
