// يطبق تعديلات ميزة "نشاط المستخدمين" على ملفين موجودين في مشروعك:
// 1) prisma/schema.prisma — إضافة حقلي lastPath/lastPathTitle وجدول UserActivity
// 2) src/app/admin/users/page.tsx — ترتيب المستخدمين: النشطون أولًا
// شغّله مرة واحدة من جذر المشروع: node scripts/patch-activity.mjs
import fs from "node:fs";

function patchFile(path, edits) {
	let src = fs.readFileSync(path, "utf8");
	const crlf = src.includes("\r\n");
	if (crlf) src = src.split("\r\n").join("\n");
	let changed = false;
	for (const [oldStr, newStr, label] of edits) {
		if (src.includes(newStr)) {
			console.log(`✓ ${label} — مطبّق مسبقًا`);
			continue;
		}
		if (!src.includes(oldStr)) {
			console.log(`⚠️ ${label} — لم يُعثر على النص الأصلي في ${path}`);
			continue;
		}
		src = src.replace(oldStr, newStr);
		changed = true;
		console.log(`✓ ${label}`);
	}
	if (changed) {
		fs.writeFileSync(path, crlf ? src.split("\n").join("\r\n") : src);
		console.log(`💾 حُفظ: ${path}`);
	}
}

// ===== 1) prisma/schema.prisma =====
patchFile("prisma/schema.prisma", [
	[
		"  lastSeenAt     DateTime?\n  blocked        Boolean        @default(false)",
		"  lastSeenAt     DateTime?\n  lastPath       String? // آخر صفحة زارها المستخدم (للوحة الإدارة)\n  lastPathTitle  String? // عنوان آخر صفحة زارها\n  blocked        Boolean        @default(false)",
		"إضافة حقلي lastPath و lastPathTitle للمستخدم",
	],
	[
		'  lectureContributions LectureContribution[]\n\n  @@map("users")\n}',
		'  lectureContributions LectureContribution[]\n  activities     UserActivity[]\n\n  @@map("users")\n}\n\n// نشاط المستخدمين — سجل ما يفعله كل مستخدم (تصفح صفحة، تحميل ملف) للوحة الإدارة فقط\nmodel UserActivity {\n  id        String   @id @default(auto()) @map("_id") @db.ObjectId\n  userId    String   @db.ObjectId\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  action    String // "view" تصفح صفحة | "download" حمّل ملفًا\n  path      String\n  label     String?\n  createdAt DateTime @default(now())\n\n  @@index([userId, createdAt(sort: Desc)])\n  @@map("user_activities")\n}',
		"إضافة جدول UserActivity",
	],
]);

// ===== 2) src/app/admin/users/page.tsx =====
const OLD_MEMO = `  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, query]);`;

const NEW_MEMO = `  const filtered = useMemo(() => {
    if (!users) return null;
    // الترتيب: المتصلون الآن أولًا، ثم الأحدث نشاطًا فالأقدم، ومن لم يُسجّل نشاط في الأخير
    const sorted = [...users].sort((a, b) => {
      const aOnline = isOnline(a.lastSeenAt, now) ? 1 : 0;
      const bOnline = isOnline(b.lastSeenAt, now) ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [users, query, now]);`;

patchFile("src/app/admin/users/page.tsx", [
	[OLD_MEMO, NEW_MEMO, "ترتيب المستخدمين: النشطون أولًا"],
]);

console.log("\n✅ انتهى — الآن شغّل: npx prisma db push ثم npx prisma generate");
