"use client";

// نبضة تواجد — تحدّث "آخر ظهور" والصفحة الحالية للمستخدم المسجّل
// تُستخدم لعرض "المتصلون الآن" ونشاط المستخدمين في لوحة الإدارة فقط
//
// قواعد توفير الطلبات (مهمة جدًا لتكلفة الاستضافة):
// 1) الزائر غير المسجّل يرسل نبضة واحدة ثم تتوقف نهائيًا (الخادم يُعلِمنا بذلك)
// 2) المسجّل يرسل كل 5 دقائق لا كل دقيقة
// 3) لا نبض إذا كان التبويب مخفيًا أو المستخدم خاملًا منذ 15 دقيقة
// 4) لا نعيد إرسال نفس المسار مرتين متتاليتين دون انقضاء المدة

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const PING_INTERVAL_MS = 5 * 60 * 1000; // كل 5 دقائق
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // خمول ربع ساعة = توقف
const ACTIVITY_EVENTS = [
	"pointerdown",
	"keydown",
	"scroll",
	"touchstart",
] as const;

// تُشارَك بين إعادات التركيب عند التنقل داخل الموقع
let disabledForSession = false;

export function PresenceHeartbeat() {
	const pathname = usePathname();
	const lastPingAt = useRef(0);
	const lastPingPath = useRef<string | null>(null);
	const lastActivityAt = useRef(Date.now());

	useEffect(() => {
		if (disabledForSession) return;

		let stopped = false;
		let intervalId: ReturnType<typeof setInterval> | undefined;

		const markActive = () => {
			lastActivityAt.current = Date.now();
		};

		const stopForever = () => {
			disabledForSession = true;
			stopped = true;
			if (intervalId) clearInterval(intervalId);
		};

		const ping = async (force = false) => {
			if (stopped || disabledForSession) return;
			if (document.visibilityState !== "visible") return;

			const now = Date.now();
			// خامل منذ مدة طويلة — لا داعي لإزعاج الخادم
			if (now - lastActivityAt.current > IDLE_TIMEOUT_MS) return;

			const path = window.location.pathname;
			const samePath = lastPingPath.current === path;
			const withinWindow = now - lastPingAt.current < PING_INTERVAL_MS;
			if (!force && samePath && withinWindow) return;
			// تنقّل سريع بين الصفحات: نكتفي بنبضة كل 30 ثانية على الأكثر
			if (!samePath && now - lastPingAt.current < 30_000) return;

			lastPingAt.current = now;
			lastPingPath.current = path;

			try {
				const res = await fetch("/api/presence", {
					method: "POST",
					keepalive: true,
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						path,
						// نأخذ الجزء الأول من عنوان الصفحة (قبل اسم المنصة)
						title: document.title.split("\u2014")[0].trim().slice(0, 200),
					}),
				});
				// الخادم يخبرنا أن الزائر غير مسجّل — لا فائدة من أي نبضة لاحقة
				if (res.headers.get("x-presence") === "anonymous") stopForever();
			} catch {
				// تجاهل — النبضة ليست عملية حرجة
			}
		};

		void ping();
		intervalId = setInterval(() => void ping(), PING_INTERVAL_MS);

		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				markActive();
				void ping();
			}
		};
		document.addEventListener("visibilitychange", onVisibilityChange);
		for (const evt of ACTIVITY_EVENTS) {
			window.addEventListener(evt, markActive, { passive: true });
		}

		return () => {
			stopped = true;
			if (intervalId) clearInterval(intervalId);
			document.removeEventListener("visibilitychange", onVisibilityChange);
			for (const evt of ACTIVITY_EVENTS) {
				window.removeEventListener(evt, markActive);
			}
		};
		// إعادة التقييم عند تغيّر المسار (تنقّل داخلي) — مع احترام الحدود أعلاه
	}, [pathname]);

	return null;
}
