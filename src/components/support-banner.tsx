"use client";

// إشعار دعم المنصة — بطاقة بسيطة مركّزة، النص الكامل رابط نحو صفحة القهوة ☕، قابل للإغلاق (✕)
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "coffee-banner-dismissed";
const NAVY = "#163a70";
const GOLD = "#d4af37";

export function SupportBanner() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		// يظهر من جديد في كل جلسة تصفّح جديدة (sessionStorage)
		try {
			if (!sessionStorage.getItem(KEY)) setVisible(true);
		} catch {
			setVisible(true);
		}
	}, []);

	if (!visible) return null;

	const dismiss = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
		e.preventDefault();
		e.stopPropagation();
		setVisible(false);
		try {
			sessionStorage.setItem(KEY, "1");
		} catch {
			// تجاهل
		}
	};

	return (
		<div
			className="relative mt-6 overflow-hidden rounded-xl shadow-md transition hover:shadow-lg"
			style={ { border: "1px solid rgba(212,175,55,.55)" } }
		>
			{/* زر الإغلاق */}
			<button
				type="button"
				aria-label="إغلاق الإشعار"
				onClick={dismiss}
				className="absolute left-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white/70 transition hover:bg-white/15 hover:text-white"
			>
				✕
			</button>

			{/* الإشعار كامله رابط نحو صفحة القهوة — محتوى موحّد بسيط في عمود واحد */}
			<Link
				href="/coffee"
				className="block px-6 py-5 text-center"
				style={ {
					background:
						"linear-gradient(135deg, " + NAVY + " 0%, #1e4a8f 60%, #274f96 100%)",
				} }
			>
				<div className="text-2xl">☕</div>
				<p className="mt-2 text-[13px] font-bold text-white">
					قهوة الدكتوراه — ادعم استمرار المنصة
				</p>
				<p className="mx-auto mt-2 max-w-md text-xs leading-6 text-white/85">
					هذه المنصة مجانية وستبقى كذلك دائمًا، لكن خلفها تكاليف
					حقيقية وساعات طويلة من التطوير. إن وجدتَ فيها فائدة، يكفينا
					منك ثمنُ كوب قهوة — وإن لم تستطع، فدعوةٌ صادقةٌ بالتوفيق
					تكفينا 🌱
				</p>
				<p className="mt-3 text-[11px] font-semibold" style={ { color: GOLD } }>
					اضغط هنا لدعم المنصة ←
				</p>
			</Link>
		</div>
	);
}
