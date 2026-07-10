// سكريبت لترقية مستخدم إلى مدير (الأسبوع 5)
// الاستخدام: npm run set-admin -- you@email.com ADMIN
//        npm run set-admin -- you@email.com SUPER_ADMIN
import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const roleArg = (process.argv[3] ?? "ADMIN").toUpperCase();

  if (!email) {
    console.error("❌ اكتب البريد: npm run set-admin -- you@email.com ADMIN");
    process.exit(1);
  }
  if (roleArg !== "USER" && roleArg !== "ADMIN" && roleArg !== "SUPER_ADMIN") {
    console.error("❌ الدور يجب أن يكون: USER أو ADMIN أو SUPER_ADMIN");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `❌ لا يوجد مستخدم بالبريد ${email}. سجّل الدخول مرة واحدة أولًا ثم أعد تشغيل الأمر.`,
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: roleArg as "USER" | "ADMIN" | "SUPER_ADMIN" },
  });

  console.log(`✅ تم تعيين ${updated.email} إلى الدور ${updated.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
