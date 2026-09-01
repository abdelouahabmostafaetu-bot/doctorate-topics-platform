"use server";

// تسجيل الدخول باسم المستخدم وكلمة المرور
// محمي بـ: Cloudflare Turnstile (ضد الروبوتات) + حد المحاولات (ضد تخمين كلمات المرور)
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeInternalPath } from "@/lib/safe-redirect";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  clearHits,
  getClientIp,
  isRateLimited,
  isRedirectError,
  recordHit,
} from "@/lib/rate-limit";

export type AuthFormState = { error?: string };

// 5 محاولات فاشلة كحد أقصى لكل IP كل 10 دقائق
const SIGNIN_LIMIT = 5;
const SIGNIN_WINDOW_MS = 10 * 60_000;

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = ((formData.get("username") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  const callbackUrl = safeInternalPath(formData.get("callbackUrl"));

  if (!username || !password) {
    return { error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
  }

  const ip = await getClientIp();

  // التحقق من أن الزائر إنسان (يُتخطى تلقائيًا إن لم تُضبط مفاتيح Turnstile)
  const turnstileToken =
    (formData.get("cf-turnstile-token") as string | null) ?? undefined;
  const human = await verifyTurnstile(turnstileToken, ip);
  if (!human.ok) {
    const suffix = human.codes.length ? ` [${human.codes.join(", ")}]` : "";
    return {
      error: `تعذّر التحقق من أنك إنسان — أعد تحميل الصفحة وحاول مجددًا${suffix}`,
    };
  }

  // حد المحاولات ضد التخمين الآلي
  const rateKey = `signin:${ip}`;
  const gate = isRateLimited(rateKey, SIGNIN_LIMIT);
  if (gate.limited) {
    const minutes = Math.ceil(gate.retryAfterSec / 60);
    return {
      error: `محاولات كثيرة متتالية — انتظر ${minutes} دقيقة ثم أعد المحاولة`,
    };
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      recordHit(rateKey, SIGNIN_WINDOW_MS);
      return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
    }
    // إعادة التوجيه بعد النجاح تمر من هنا — نمسح عداد المحاولات ثم نعيد رميها
    if (isRedirectError(error)) clearHits(rateKey);
    throw error;
  }
  return {};
}
