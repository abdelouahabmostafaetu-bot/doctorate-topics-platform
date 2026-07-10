import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AutoSaveFormWrapper } from "@/components/admin/auto-save-form-wrapper";
import { updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const user = session.user;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-bold">الملف الشخصي</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-6">
        <AutoSaveFormWrapper
          formId="account-profile"
          isLoggedIn
          action={updateProfileAction}
          className="space-y-4"
        >
          <label className="block text-sm">
            الاسم
            <input
              name="name"
              defaultValue={user.name ?? ""}
              dir="auto"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            حفظ
          </button>
        </AutoSaveFormWrapper>
      </div>
    </div>
  );
}
