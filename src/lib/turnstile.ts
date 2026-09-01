// التحقق من رمز Cloudflare Turnstile في الخادم — حماية من الروبوتات (مجاني)
// إن لم تُضبط المفاتيح (TURNSTILE_SECRET_KEY) تُتخطى الحماية تلقائيًا ولا يتعطل الموقع.

export type TurnstileResult = {
  ok: boolean;
  /** رموز الخطأ من Cloudflare — تساعد على التشخيص (تُعرض مؤقتًا في رسالة الخطأ) */
  codes: string[];
};

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // الميزة غير مفعّلة بعد — نسمح بالمرور حتى لا يتعطل الدخول قبل إضافة المفاتيح
  if (!secret) return { ok: true, codes: [] };
  if (!token) return { ok: false, codes: ["missing-token"] };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      },
    );
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      "error-codes"?: string[];
    } | null;
    return {
      ok: data?.success === true,
      codes: Array.isArray(data?.["error-codes"]) ? data!["error-codes"]! : [],
    };
  } catch {
    // عطل مؤقت عند الوصول إلى Cloudflare — نسمح بالمرور حتى لا يتعطل الموقع بسبب خدمة خارجية
    return { ok: true, codes: [] };
  }
}
