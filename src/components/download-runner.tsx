"use client";

// منفّذ التحميل: مؤقّت تنازلي + مراحل + شريط تقدم، ثم تنزيل الملف تلقائيًا
import { useEffect, useRef, useState } from "react";

const NAVY = "#163a70";
const GOLD = "#d4af37";

function fmt(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

const STEPS = [
	"تجهيز المواضيع",
	"تصفيف LaTeX",
	"إنشاء PDF",
	"التحميل",
];

export function DownloadRunner({
	apiUrl,
	fileName,
	estimatedSeconds,
}: {
	apiUrl: string;
	fileName: string;
	estimatedSeconds: number;
}) {
	const [status, setStatus] = useState<"working" | "done" | "error">("working");
	const [pct, setPct] = useState(4);
	const [remaining, setRemaining] = useState(estimatedSeconds);
	const [elapsed, setElapsed] = useState(0);
	const [error, setError] = useState("");
	const [blobUrl, setBlobUrl] = useState("");
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		const t0 = Date.now();
		const timer = setInterval(() => {
			const el = (Date.now() - t0) / 1000;
			setElapsed(el);
			setRemaining(Math.max(0, estimatedSeconds - el));
			setPct((p) =>
				Math.max(p, Math.min(93, Math.round((el / estimatedSeconds) * 85))),
			);
		}, 250);

		(async () => {
			try {
				const res = await fetch(apiUrl);
				if (!res.ok) {
					let msg = "تعذّر إنشاء الملف — أعد المحاولة";
					if (res.status === 401) msg = "يجب تسجيل الدخول للتحميل";
					if (res.status === 404) msg = "لا توجد مواضيع مطابقة";
					try {
						const data = (await res.json()) as { error?: string };
						if (data?.error) msg = data.error;
					} catch {
						// تجاهل
					}
					setError(msg);
					setStatus("error");
					return;
				}
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				setBlobUrl(url);
				const a = document.createElement("a");
				a.href = url;
				a.download = fileName;
				document.body.appendChild(a);
				a.click();
				a.remove();
				setPct(100);
				setStatus("done");
			} catch {
				setError("انقطع الاتصال — أعد المحاولة");
				setStatus("error");
			} finally {
				clearInterval(timer);
			}
		})();

		return () => clearInterval(timer);
	}, [apiUrl, fileName, estimatedSeconds]);

	if (status === "error") {
		return (
			<div className="mt-8 rounded-2xl border border-red-300 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
				<div className="text-3xl">⚠️</div>
				<p className="mt-2 font-semibold text-red-700 dark:text-red-300">
					{error}
				</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="mt-4 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
					style={ { background: NAVY } }
				>
					🔄 إعادة المحاولة
				</button>
			</div>
		);
	}

	const stepIdx = status === "done" ? 3 : pct < 25 ? 0 : pct < 60 ? 1 : 2;

	return (
		<div className="mt-8">
			{/* المؤقّت التنازلي */}
			{status === "working" && (
				<div className="mb-6 text-center">
					<div
						className="font-mono text-5xl font-bold tabular-nums tracking-wider"
						style={ { color: NAVY } }
						dir="ltr"
					>
						{fmt(remaining)}
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						{remaining > 0
							? "الوقت المتبقي تقريبًا"
							: "لحظات قليلة ويكتمل الملف..."}
						{" • انقضى "}
						<span dir="ltr" className="tabular-nums">
							{fmt(elapsed)}
						</span>
					</p>
				</div>
			)}

			{/* المراحل */}
			<div className="mb-4 flex items-center justify-between">
				{STEPS.map((label, i) => (
					<div key={label} className="flex flex-1 items-center">
						<div className="flex flex-col items-center gap-1.5" style={ { minWidth: 64 } }>
							<div
								className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500"
								style={
									i < stepIdx || status === "done"
										? { background: NAVY, borderColor: NAVY, color: "#fff" }
										: i === stepIdx
											? { background: "#fff", borderColor: GOLD, color: NAVY }
											: { background: "transparent", borderColor: "#cbd5e1", color: "#94a3b8" }
								}
							>
								{i < stepIdx || status === "done" ? "✓" : i + 1}
							</div>
							<span
								className="text-[10px] font-medium"
								style={ { color: i <= stepIdx ? NAVY : "#94a3b8" } }
							>
								{label}
							</span>
						</div>
						{i < STEPS.length - 1 && (
							<div
								className="mx-1 mb-4 h-0.5 flex-1 rounded transition-all duration-500"
								style={ { background: i < stepIdx ? GOLD : "#e2e8f0" } }
							/>
						)}
					</div>
				))}
			</div>

			{/* شريط التقدم */}
			<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full transition-all duration-500"
					style={ {
						width: pct + "%",
						background: "linear-gradient(90deg, " + NAVY + ", " + GOLD + ")",
					} }
				/>
			</div>
			<div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
				<span className="tabular-nums">{pct}%</span>
				<span>
					{status === "done" ? "✅ اكتمل — بدأ التحميل" : STEPS[stepIdx] + "..."}
				</span>
			</div>

			{status === "working" && (
				<p className="mt-5 text-center text-sm text-muted-foreground">
					يتم الآن تجميع التمارين من قاعدة البيانات وتصفيفها بخط LaTeX
					الاحترافي... لا تغلق هذه الصفحة ☕
				</p>
			)}
			{status === "done" && (
				<div className="mt-6 rounded-xl border p-5 text-center" style={ { borderColor: GOLD, background: "rgba(212,175,55,.06)" } }>
					<div className="text-3xl">🎉</div>
					<p className="mt-1 text-sm font-semibold" style={ { color: NAVY } }>
						تم إنشاء الملف بنجاح — بالتوفيق في مراجعتك 📚
					</p>
					{blobUrl && (
						<a
							href={blobUrl}
							download={fileName}
							className="mt-3 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
							style={ { background: NAVY } }
						>
							⬇️ إذا لم يبدأ التحميل تلقائيًا، اضغط هنا
						</a>
					)}
				</div>
			)}
		</div>
	);
}
