"use client";

// نماذج الحساب: الملف الشخصي + تغيير كلمة المرور + حذف الحساب
import { useActionState, useRef, useState } from "react";
import {
  updateProfileAction,
  changePasswordAction,
  deleteAccountAction,
  type AccountFormState,
} from "@/app/account/actions";

const initialState: AccountFormState = {};

const inputClass =
  "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        {state.success}
      </p>
    );
  }
  return null;
}

// الاسم + الصورة الشخصية
export function ProfileForm({
  initialName,
  initialImage,
}: {
  initialName: string;
  initialImage: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? initialImage;

  return (
    <form action={formAction} className="space-y-4 text-right">
      <Feedback state={state} />

      <div className="flex items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="الصورة الشخصية"
            className="h-16 w-16 rounded-full border object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
            {(initialName || "؟").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:border-primary"
          >
            📷 اختيار صورة
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG / PNG / WebP — بحد أقصى 2MB
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />

      <label className="block text-sm font-medium">
        الاسم
        <input
          name="name"
          defaultValue={initialName}
          required
          maxLength={60}
          dir="auto"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
      </button>
    </form>
  );
}

// تغيير كلمة المرور
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 text-right">
      <Feedback state={state} />

      <label className="block text-sm font-medium">
        كلمة المرور الحالية
        <input
          name="currentPassword"
          type="password"
          dir="ltr"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium">
        كلمة المرور الجديدة
        <input
          name="newPassword"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      <label className="block text-sm font-medium">
        تأكيد كلمة المرور الجديدة
        <input
          name="confirmNewPassword"
          type="password"
          dir="ltr"
          required
          minLength={6}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ التغيير…" : "🔑 تغيير كلمة المرور"}
      </button>
    </form>
  );
}

// حذف الحساب نهائيًا
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 text-right">
      <Feedback state={state} />

      <p className="text-xs text-muted-foreground">
        حذف الحساب نهائي — تُحذف مواضيعك المحفوظة وكل بياناتك ولا يمكن
        التراجع.
      </p>

      {hasPassword && (
        <label className="block text-sm font-medium">
          كلمة المرور للتأكيد
          <input
            name="password"
            type="password"
            dir="ltr"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="confirm"
          required
          className="accent-[hsl(var(--destructive))]"
        />
        أؤكد أنني أريد حذف حسابي نهائيًا
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-destructive px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "جارٍ حذف الحساب…" : "🗑️ حذف الحساب نهائيًا"}
      </button>
    </form>
  );
}
