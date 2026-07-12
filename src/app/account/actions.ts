"use server";

// إجراءات الحساب: تحديث الملف الشخصي (الاسم + الصورة) + تغيير كلمة المرور + حذف الحساب
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";

export type AccountFormState = { error?: string; success?: string };

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB

// تحديث الاسم والصورة الشخصية
export async function updateProfileAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "يجب تسجيل الدخول أولًا" };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name || name.length > 60) {
    return { error: "أدخل اسمًا صحيحًا (60 حرفًا كحد أقصى)" };
  }

  const data: { name: string; image?: string } = { name };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const ext = AVATAR_TYPES[avatar.type];
    if (!ext) {
      return { error: "صيغة الصورة غير مدعومة — استخدم JPG أو PNG أو WebP" };
    }
    if (avatar.size > AVATAR_MAX_BYTES) {
      return { error: "حجم الصورة كبير — الحد الأقصى 2MB" };
    }

    const buffer = Buffer.from(await avatar.arrayBuffer());
    const key = `avatars/${userId}-${Date.now()}.${ext}`;
    data.image = await uploadFile(buffer, key, avatar.type);

    // حذف الصورة القديمة من التخزين إن وُجدت (يتجاهل الأخطاء بهدوء)
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (current?.image) await deleteFile(current.image);
  }

  await prisma.user.update({ where: { id: userId }, data });
  revalidatePath("/account");
  revalidatePath("/account/settings");
  return { success: "تم حفظ التغييرات ✅" };
}

// تغيير كلمة المرور (للحسابات المسجلة باسم مستخدم فقط)
export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "يجب تسجيل الدخول أولًا" };

  const currentPassword = (formData.get("currentPassword") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";
  const confirmNewPassword =
    (formData.get("confirmNewPassword") as string) || "";

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { error: "حسابك مسجّل عبر Google — لا توجد كلمة مرور لتغييرها" };
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return { error: "كلمة المرور الحالية غير صحيحة" };
  if (newPassword.length < 6) {
    return { error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" };
  }
  if (newPassword !== confirmNewPassword) {
    return { error: "كلمتا المرور الجديدتان غير متطابقتين" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: "تم تغيير كلمة المرور بنجاح ✅" };
}

// حذف الحساب — مواضيع المستخدم ومساهماته المنشورة لا تُحذف —
// يُحذف الحساب فقط من القائمة (إخفاء الهوية + منع تسجيل الدخول).
// لا نحذف سجل المستخدم نهائيًا حتى لا تتعطل المساهمات المرتبطة به (علاقة إلزامية).
export async function deleteAccountAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "يجب تسجيل الدخول أولًا" };

  if (!formData.get("confirm")) {
    return { error: "يجب تأكيد رغبتك في حذف الحساب" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "الحساب غير موجود" };

  // للحسابات بكلمة مرور: نطلب كلمة المرور للتأكيد
  if (user.passwordHash) {
    const password = (formData.get("password") as string) || "";
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return { error: "كلمة المرور غير صحيحة — لا يمكن حذف الحساب" };
  }

  // حذف الصورة الشخصية من التخزين
  if (user.image) await deleteFile(user.image);

  // حذف بيانات الدخول والبيانات الخاصة (المفضلة، المسودات، البلاغات، الجلسات)
  await prisma.favorite.deleteMany({ where: { userId } });
  await prisma.draft.deleteMany({ where: { userId } });
  await prisma.report.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });

  // إخفاء الهوية: يختفي الحساب من قوائم المستخدمين والمساهمين،
  // بينما تبقى المواضيع والمساهمات المنشورة متاحة للطلبة.
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: "مستخدم محذوف",
      email: `deleted-${userId}@deleted.local`,
      image: null,
      passwordHash: null,
      points: 0,
      userType: null,
      role: "USER",
      emailVerified: null,
    },
  });

  // تسجيل الخروج والعودة للرئيسية
  await signOut({ redirectTo: "/" });
  return {};
}
