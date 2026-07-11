"use server";

// تسجيل الدخول باسم المستخدم وكلمة المرور
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type AuthFormState = { error?: string };

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = ((formData.get("username") as string) || "").trim();
  const password = (formData.get("password") as string) || "";

  if (!username || !password) {
    return { error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
  }

  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
    }
    // إعادة التوجيه بعد النجاح تمر من هنا — يجب إعادة رميها
    throw error;
  }
  return {};
}
