"use client";

// نموذج تسجيل الدخول: اسم المستخدم وكلمة المرور فقط
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/signin/actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="w-full space-y-3.5 text-right">
      {state.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      )}

      <label className="block text-xs font-semibold text-foreground/80">
        اسم المستخدم
        <input
          name="username"
          dir="ltr"
          required
          autoComplete="username"
          placeholder="username"
          className="mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm font-normal shadow-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <label className="block text-xs font-semibold text-foreground/80">
        كلمة المرور
        <input
          name="password"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm font-normal shadow-sm outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="!mt-5 w-full rounded-lg bg-primary px-6 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ الدخول…" : "تسجيل الدخول"}
      </button>
    </form>
  );
}
