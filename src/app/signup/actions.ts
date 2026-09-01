"use server";

// إنشاء حساب جديد: اسم مستخدم + كلمة مرور + الصفة (طالب/أستاذ) + الموافقة على الشروط
// محمي بـ: Cloudflare Turnstile (ضد الروبوتات) + حد إنشاء الحسابات لكل IP
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { usernameToEmail, USERNAME_REGEX } from "@/lib/username";
import { safeInternalPath } from "@/lib/safe-redirect";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp, isRateLimited, recordHit } from "@/lib/rate-limit";

export type SignupFormState = { error?: string };

// 3 حسابات جديدة كحد أقصى لكل IP في الساعة
const SIGNUP_LIMIT = 3;
const SIGNUP_WINDOW_MS = 60 * 60_000;

export async function registerAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const username = ((formData.get("username") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";
  const userType = formData.get("userType");
  const agree = formData.get("agree");
  const callbackUrl = safeInternalPath(formData.get("callbackUrl"));

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

  const ip = await getClientIp();

  // التحقق من أن الزائر إنسان (يُتخطى تلقائيًا إن لم تُضبط مفاتيح Turnstile)
  const turnstileToken =
    (formData.get("cf-turnstile-token") as string | null) ?? undefined;
  const human = await verifyTurnstile(turnstileToken, ip);
  if (!human) {
    return {
      error: "تعذّر التحقق من أنك إنسان — أعد تحميل الصفحة وحاول مجددًا",
    };
  }

  // حد إنشاء الحسابات ضد التسجيل الآلي الجماعي
  const rateKey = `signup:${ip}`;
  const gate = isRateLimited(rateKey, SIGNUP_LIMIT);
  if (gate.limited) {
    const minutes = Math.ceil(gate.retryAfterSec / 60);
    return {
      error: `تم إنشاء حسابات كثيرة من هذا الجهاز مؤخرًا — أعد المحاولة بعد ${minutes} دقيقة`,
    };
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
  recordHit(rateKey, SIGNUP_WINDOW_MS);

  // تسجيل الدخول تلقائيًا بعد إنشاء الحساب
  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "تم إنشاء الحساب — سجّل الدخول الآن من صفحة الدخول" };
    }
    throw error;
  }
  return {};
}
