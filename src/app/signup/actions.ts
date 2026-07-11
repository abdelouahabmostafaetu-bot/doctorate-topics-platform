"use server";

// إنشاء حساب جديد: اسم مستخدم + كلمة مرور + الصفة (طالب/أستاذ) + الموافقة على الشروط
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { usernameToEmail, USERNAME_REGEX } from "@/lib/username";

export type SignupFormState = { error?: string };

export async function registerAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const username = ((formData.get("username") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";
  const userType = formData.get("userType");
  const agree = formData.get("agree");

  // التحقق من المدخلات
  if (!USERNAME_REGEX.test(username)) {
    return {
      error:
        "اسم المستخدم يجب أن يكون بين 3 و20 حرفًا لاتينيًا أو أرقامًا أو الرموز _ . - فقط (بدون مسافات)",
    };
  }
  if (password.length < 6) {
    return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  }
  if (password !== confirmPassword) {
    return { error: "كلمتا المرور غير متطابقتين" };
  }
  if (userType !== "teacher" && userType !== "student") {
    return { error: "اختر صفتك: طالب أو أستاذ" };
  }
  if (!agree) {
    return { error: "يجب الموافقة على شروط الاستخدام لإنشاء الحساب" };
  }

  // هل الاسم محجوز؟
  const email = usernameToEmail(username);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "اسم المستخدم محجوز — اختر اسمًا آخر" };
  }

  // إنشاء الحساب
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name: username,
      passwordHash,
      userType,
    },
  });

  // تسجيل الدخول تلقائيًا بعد إنشاء الحساب
  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "تم إنشاء الحساب — سجّل الدخول الآن من صفحة الدخول" };
    }
    throw error;
  }
  return {};
}
