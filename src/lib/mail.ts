// مساعد إرسال البريد عبر Resend (https://resend.com) — REST API مباشرة بدون مكتبة إضافية
// الإعداد: ضع EMAIL_API_KEY (مفتاح Resend) و EMAIL_FROM في .env (راجع قسم الأسبوع 7 في README)

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!apiKey) {
    console.warn("EMAIL_API_KEY غير مُعرَّف — تم تجاهل إرسال البريد:", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** فحص بسيط لتوفر خدمة البريد — يُستخدم في فحص الحالة التلقائي (FR-705) */
export async function checkMailHealth(): Promise<
  "operational" | "degraded" | "down"
> {
  if (!process.env.EMAIL_API_KEY) return "degraded";
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}` },
    });
    return res.ok ? "operational" : "degraded";
  } catch {
    return "down";
  }
}
