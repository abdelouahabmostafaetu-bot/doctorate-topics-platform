"use client";

// نموذج إنشاء حساب: اسم مستخدم + كلمة مرور + تأكيد + الصفة (طالب/أستاذ) + الموافقة
import { useActionState } from "react";
import { registerAction, type SignupFormState } from "@/app/signup/actions";

const initialState: SignupFormState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="w-full space-y-4 text-right">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <label className="block text-sm font-medium">
        اسم المستخدم
        <input
          name="username"
          dir="ltr"
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
          placeholder="username"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
        />
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          3–20 حرفًا لاتينيًا أو أرقامًا — بدون مسافات
        </span>
      </label>

      <label className="block text-sm font-medium">
        كلمة المرور
        <input
          name="password"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="block text-sm font-medium">
        تأكيد كلمة المرور
        <input
          name="confirmPassword"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
        />
      </label>

      <fieldset className="text-sm">
        <legend className="font-medium">صفتك</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:font-medium">
            <input
              type="radio"
              name="userType"
              value="student"
              defaultChecked
              className="accent-[hsl(var(--primary))]"
            />
            🎓 طالب
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 transition has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:font-medium">
            <input
              type="radio"
              name="userType"
              value="teacher"
              className="accent-[hsl(var(--primary))]"
            />
            👨‍🏫 أستاذ
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
      </button>
    </form>
  );
}
