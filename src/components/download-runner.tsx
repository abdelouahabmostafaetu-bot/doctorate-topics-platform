"use client";

// منفّذ التحميل: شريط تقدم + مدة تقديرية، ثم تنزيل الملف تلقائيًا
import { useEffect, useRef, useState } from "react";

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
	const [error, setError] = useState("");
	const [blobUrl, setBlobUrl] = useState("");
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		const t0 = Date.now();
		const timer = setInterval(() => {
			const elapsed = (Date.now() - t0) / 1000;
			setPct((p) =>
				Math.max(p, Math.min(93, Math.round((elapsed / estimatedSeconds) * 85))),
			);
		}, 400);

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
			<div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-5 text-center dark:border-red-900 dark:bg-red-950">
				<p className="font-medium text-red-700 dark:text-red-300">❌ {error}</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="mt-3 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
				>
					🔄 إعادة المحاولة
				</button>
			</div>
		);
	}

	return (
		<div className="mt-6">
			<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all duration-500"
					style={ { width: pct + "%" } }
				/>
			</div>
			<div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
				<span>{pct}%</span>
				<span>
					{status === "done"
						? "✅ اكتمل — بدأ التحميل"
						: "⏳ المدة التقديرية: نحو " + estimatedSeconds + " ثانية"}
				</span>
			</div>
			{status === "working" && (
				<p className="mt-4 text-center text-sm text-muted-foreground">
					يتم الآن تجميع التمارين من قاعدة البيانات وتصفيفها بخط LaTeX
					الاحترافي... لا تغلق هذه الصفحة ☕
				</p>
			)}
			{status === "done" && (
				<div className="mt-4 text-center">
					<p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
						تم إنشاء الملف بنجاح 🎉
					</p>
					{blobUrl && (
						<a
							href={blobUrl}
							download={fileName}
							className="mt-2 inline-block text-sm text-primary underline underline-offset-4"
						>
							إذا لم يبدأ التحميل تلقائيًا، اضغط هنا
						</a>
					)}
				</div>
			)}
		</div>
	);
}
