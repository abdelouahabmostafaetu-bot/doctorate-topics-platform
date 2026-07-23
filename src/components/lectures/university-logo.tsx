"use client";

// شعار الجامعة مع معالجة فشل التحميل:
// إذا تعذّر تحميل الصورة (رابط خاطئ أو موقع يمنع التضمين)
// نعود تلقائيًا للأيقونة الافتراضية بدل أيقونة الصورة المكسورة.
import { useState } from "react";
import { Building2 } from "lucide-react";

export function UniversityLogo({
	src,
	alt,
	boxClass,
	fallbackClass,
	iconClass,
}: {
	src: string;
	alt: string;
	boxClass: string;
	fallbackClass: string;
	iconClass: string;
}) {
	const [failed, setFailed] = useState(false);

	// نمرر الروابط الخارجية عبر وسيط الخادم (/api/logo)
	// حتى لا يمنعها المتصفح أو موقع الجامعة.
	const effectiveSrc = /^https?:\/\//i.test(src)
		? "/api/logo?u=" + encodeURIComponent(src)
		: src;

	if (failed) {
		return (
			<span className={fallbackClass}>
				<Building2 className={iconClass} />
			</span>
		);
	}

	return (
		<span className={boxClass}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={effectiveSrc}
				alt={alt}
				loading="lazy"
				referrerPolicy="no-referrer"
				className="h-full w-full object-contain p-0.5"
				onError={() => setFailed(true)}
			/>
		</span>
	);
}
