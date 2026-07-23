"use client";

// منفّذ التحميل متعدد الأجزاء: يحمّل كل المواضيع المطابقة للفلاتر على أجزاء
// متتالية (جزء تلو الآخر) مع مؤقّت زمني + شريط تقدم إجمالي + حالة كل جزء
import { useEffect, useRef, useState } from "react";

const NAVY = "#163a70";
const GOLD = "#d4af37";

function fmt(sec: number): string {
	const s = Math.max(0, Math.round(sec));
	const m = Math.floor(s / 60);
	const r = s % 60;
	return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

export type BulkJob = {
	apiUrl: string;
	fileName: string;
	count: number;
	estimatedSeconds: number;
};

type JobState = "pending" | "working" | "done" | "error";

export function MultiDownloadRunner({ jobs }: { jobs: BulkJob[] }) {
	const totalEstimated = jobs.reduce((s, j) => s + j.estimatedSeconds, 0);
	const [states, setStates] = useState<JobState[]>(
		jobs.map((_, i) => (i === 0 ? "working" : "pending")),
	);
	const [urls, setUrls] = useState<string[]>(jobs.map(() => ""));
	const [error, setError] = useState("");
	const [elapsed, setElapsed] = useState(0);
	const [remaining, setRemaining] = useState(totalEstimated);
	const [pct, setPct] = useState(3);
	const started = useRef(false);

	useEffect(() => {
		if (started.current) return;
		started.current = true;
		const t0 = Date.now();
		const timer = setInterval(() => {
			const el = (Date.now() - t0) / 1000;
			setElapsed(el);
			setRemaining(Math.max(0, totalEstimated - el));
			setPct((p) =>
				Math.max(p, Math.min(93, Math.round((el / totalEstimated) * 88))),
			);
		}, 250);

		(async () => {
			for (let i = 0; i < jobs.length; i++) {
				setStates((s) => s.map((v, k) => (k === i ? "working" : v)));
				try {
					const res = await fetch(jobs[i].apiUrl);
					if (!res.ok) {
						let msg = "تعذّر إنشاء الجزء " + (i + 1) + " — أعد المحاولة";
						if (res.status === 401) msg = "يجب تسجيل الدخول للتحميل";
						try {
							const data = (await res.json()) as { error?: string };
							if (data?.error) msg = data.error;
						} catch {
							// تجاهل
						}
						setError(msg);
						setStates((s) => s.map((v, k) => (k === i ? "error" : v)));
						return;
					}
					const blob = await res.blob();
					const url = URL.createObjectURL(blob);
					setUrls((u) => u.map((v, k) => (k === i ? url : v)));
					const a = document.createElement("a");
					a.href = url;
					a.download = jobs[i].fileName;
					document.body.appendChild(a);
					a.click();
					a.remove();
					setStates((s) => s.map((v, k) => (k === i ? "done" : v)));
				} catch {
					setError("انقطع الاتصال أثناء الجزء " + (i + 1) + " — أعد المحاولة");
					setStates((s) => s.map((v, k) => (k === i ? "error" : v)));
					return;
				}
			}
			setPct(100);
			clearInterval(timer);
		})();

		return () => clearInterval(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const allDone = states.every((s) => s === "done");
	const hasError = states.some((s) => s === "error");
	const doneCount = states.filter((s) => s === "done").length;

	return (
		<div className="mt-8">
			{/* المؤقّت: الوقت المتبقي + الوقت المنقضي */}
			{!allDone && !hasError && (
				<div className="mb-6 text-center">
					<div
						className="font-mono text-5xl font-bold tabular-nums tracking-wider"
						style={ { color: NAVY } }
					>
						{fmt(remaining)}
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						الوقت المتوقع المتبقي • انقضى {fmt(elapsed)} • تم {doneCount}/
						{jobs.length} من الأجزاء
					</p>
				</div>
			)}

			{/* شريط التقدم الإجمالي */}
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full transition-all duration-300"
					style={ {
						width: pct + "%",
						background:
							"linear-gradient(90deg, " + NAVY + ", " + GOLD + ")",
					} }
				/>
			</div>

			{/* قائمة الأجزاء وحالة كل واحد */}
			<ul className="mt-5 space-y-2 text-right">
				{jobs.map((j, i) => (
					<li
						key={j.apiUrl}
						className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
						style={ {
							borderColor:
								states[i] === "done"
									? "rgba(22,163,74,.4)"
									: "rgba(22,58,112,.2)",
						} }
					>
						<span className="font-medium">
							{states[i] === "done" && "✅ "}
							{states[i] === "working" && "⏳ "}
							{states[i] === "error" && "⚠️ "}
							{states[i] === "pending" && "○ "}
							الجزء {i + 1} — {j.count} موضوع (~{fmt(j.estimatedSeconds)})
						</span>
						{states[i] === "done" && urls[i] && (
							<a
								href={urls[i]}
								download={j.fileName}
								className="font-semibold text-primary hover:underline"
							>
								⬇️ إعادة التحميل
							</a>
						)}
					</li>
				))}
			</ul>

			{hasError && (
				<div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-5 text-center dark:border-red-900 dark:bg-red-950">
					<p className="font-semibold text-red-700 dark:text-red-300">
						{error}
					</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="mt-3 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
						style={ { background: NAVY } }
					>
						🔄 إعادة المحاولة
					</button>
				</div>
			)}

			{allDone && (
				<div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-5 text-center dark:border-green-900 dark:bg-green-950">
					<div className="text-3xl">🎉</div>
					<p className="mt-2 font-semibold text-green-700 dark:text-green-300">
						تم تحميل كل الأجزاء ({jobs.length}) في {fmt(elapsed)}
					</p>
					<p className="mt-1 text-[11px] text-muted-foreground">
						إذا لم يبدأ تحميل أحد الملفات، استخدم زر «إعادة التحميل» بجانب الجزء
					</p>
				</div>
			)}
		</div>
	);
}
