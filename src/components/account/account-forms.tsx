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
  "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        ⚠️ {state.error}
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

// زر إرسال موحّد
function SubmitButton({
  pending,
  label,
  pendingLabel,
  danger = false,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-md px-6 py-2.5 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${
        danger
          ? "bg-destructive text-white"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// الاسم + الصورة الشخصية + نوع المستخدم
export function ProfileForm({
  initialName,
  initialImage,
  initialUserType,
}: {
  initialName: string;
  initialImage: string | null;
  initialUserType: "student" | "teacher";
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const shown = removeAvatar ? null : (preview ?? initialImage);

  return (
    <form action={formAction} className="space-y-4 text-right">
      <Feedback state={state} />

      <input
        type="hidden"
        name="removeAvatar"
        value={removeAvatar ? "1" : ""}
      />

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
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:border-primary"
            >
              📷 تغيير الصورة
            </button>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  setRemoveAvatar(true);
                  setPreview(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
              >
                🗑️ إزالة الصورة
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
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
          if (file) setRemoveAvatar(false);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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

        <label className="block text-sm font-medium">
          نوع المستخدم
          <select
            name="userType"
            defaultValue={initialUserType}
            className={inputClass}
          >
            <option value="student">🎓 طالب</option>
            <option value="teacher">👨‍🏫 أستاذ</option>
          </select>
        </label>
      </div>

      <SubmitButton
        pending={pending}
        label="💾 حفظ التغييرات"
        pendingLabel="جارٍ الحفظ…"
      />
    </form>
  );
}

// تغيير كلمة المرور
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";

  return (
    <form action={formAction} className="space-y-3 text-right">
      <Feedback state={state} />

      <label className="block text-sm font-medium">
        كلمة المرور الحالية
        <input
          name="currentPassword"
          type={type}
          dir="ltr"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          كلمة المرور الجديدة
          <input
            name="newPassword"
            type={type}
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
            type={type}
            dir="ltr"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
            className="accent-[hsl(var(--primary))]"
          />
          👁️ إظهار كلمات المرور
        </label>
        <span className="text-xs text-muted-foreground">
          6 أحرف على الأقل
        </span>
      </div>

      <SubmitButton
        pending={pending}
        label="🔑 تغيير كلمة المرور"
        pendingLabel="جارٍ التغيير…"
      />
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

      <div className="rounded-md border-s-2 border-amber-400 bg-amber-500/10 px-3 py-2 text-xs leading-6">
        📌 مواضيعك ومساهماتك المنشورة <b>لا تُحذف</b> — تبقى متاحة للطلبة. حسابك
        فقط يُحذف من قائمة المستخدمين والمساهمين، ولن تتمكن من تسجيل الدخول
        مجددًا.
      </div>

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

      <SubmitButton
        pending={pending}
        label="🗑️ حذف الحساب نهائيًا"
        pendingLabel="جارٍ حذف الحساب…"
        danger
      />
    </form>
  );
}
