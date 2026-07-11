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
          autoComplete="username"
          placeholder="username"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="block text-sm font-medium">
        كلمة المرور
        <input
          name="password"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ الدخول…" : "تسجيل الدخول"}
      </button>
    </form>
  );
}
