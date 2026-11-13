"use server";
import { auth } from "@/auth";
import { sendMail } from "@/lib/mail";
import { getPrivateMessage, markPrivateRead, recordPrivateReply } from "@/lib/private-access/inbox";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requirePrivateOwner() {
  const session = await auth();
  const epoch = process.env.PRIVATE_ACCESS_EPOCH;
  if (process.env.PRIVATE_SITE_MODE !== "true" || !epoch || !process.env.PRIVATE_ADMIN_EMAIL ||
      session?.user?.email?.toLowerCase() !== process.env.PRIVATE_ADMIN_EMAIL.toLowerCase() ||
      session.user.role !== "SUPER_ADMIN" || session.user.blocked || session.user.privateAccessEpoch !== epoch) throw new Error("Unauthorized");
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c));
export async function markRead(form: FormData) {
  await requirePrivateOwner();
  await markPrivateRead(String(form.get("id") || ""));
  revalidatePath("/admin/private-inbox");
}
export async function reply(form: FormData) {
  await requirePrivateOwner();
  const id = String(form.get("id") || ""), body = String(form.get("reply") || "").trim();
  if (!body || body.length > 4000) redirect("/admin/private-inbox?status=invalid");
  const message = await getPrivateMessage(id);
  if (!message || !message.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.email)) redirect("/admin/private-inbox?status=invalid");
  const ok = await sendMail({to: message.email, subject: "رد إدارة DocMath DZ", html: `<p>${escape(body).replace(/\n/g,"<br>")}</p>`});
  if (!ok) redirect("/admin/private-inbox?status=mail-error");
  try { await recordPrivateReply(id, body); } catch { redirect("/admin/private-inbox?status=sent-unrecorded"); }
  revalidatePath("/admin/private-inbox");
  redirect("/admin/private-inbox?status=sent");
}
