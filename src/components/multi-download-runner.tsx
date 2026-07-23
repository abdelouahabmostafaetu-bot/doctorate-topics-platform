"use client";

// منفّذ التحميل الموحّد: يجلب الأجزاء من الخادم واحدًا تلو الآخر، ثم يدمجها
// في المتصفح بواسطة pdf-lib في ملف PDF واحد يُحمّل مرة واحدة — مع مؤقّت زمني
// وشريط تقدم وحالة كل جزء. إذا فشل الدمج لأي سبب، تُحمّل الأجزاء منفصلة كحل احتياطي.
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
type Phase = "downloading" | "merging" | "done" | "error";

export function MultiDownloadRunner({
	jobs,
	mergedFileName,
	totalCount,
}: {
	jobs: BulkJob[];
	mergedFileName: string;
	totalCount: number;
}) {
	// تقدير الوقت: توليد الأجزاء + زمن الدمج في المتصفح
	const totalEstimated =
		jobs.reduce((s, j) => s + j.estimatedSeconds, 0) + 4 + jobs.length * 2;
	const [phase, setPhase] = useState<Phase>("downloading");
	const [states, setStates] = useState<JobState[]>(
		jobs.map((_, i) => (i === 0 ? "working" : "pending")),
	);
	const [error, setError] = useState("");
	const [elapsed, setElapsed] = useState(0);
	const [remaining, setRemaining] = useState(totalEstimated);
	const [pct, setPct] = useState(3);
	const [blobUrl, setBlobUrl] = useState("");
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

		const saveBlob = (blob: Blob, name: string) => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = name;
			document.body.appendChild(a);
			a.click();
			a.remove();
			return url;
		};

		(async () => {
			const buffers: ArrayBuffer[] = [];
			// 1) جلب كل الأجزاء بالتتابع (دون تحميلها للمستخدم)
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
						setPhase("error");
						return;
					}
					buffers.push(await res.arrayBuffer());
					setStates((s) => s.map((v, k) => (k === i ? "done" : v)));
				} catch {
					setError("انقطع الاتصال أثناء الجزء " + (i + 1) + " — أعد المحاولة");
					setStates((s) => s.map((v, k) => (k === i ? "error" : v)));
					setPhase("error");
					return;
				}
			}

			// 2) دمج الأجزاء في ملف PDF واحد داخل المتصفح
			setPhase("merging");
			try {
				const { PDFDocument } = await import("pdf-lib");
				const merged = await PDFDocument.create();
				merged.setTitle("Recueil de Sujets — Doctorat Mathématiques");
				merged.setProducer("docmathdz.dev");
				for (const buf of buffers) {
					const doc = await PDFDocument.load(buf);
					const pages = await merged.copyPages(doc, doc.getPageIndices());
					for (const p of pages) merged.addPage(p);
				}
				const bytes = await merged.save();
				const blob = new Blob([bytes as BlobPart], {
					type: "application/pdf",
				});
				setBlobUrl(saveBlob(blob, mergedFileName));
				setPct(100);
				setPhase("done");
			} catch (e) {
				// حل احتياطي: إذا فشل الدمج، حمّل الأجزاء كملفات منفصلة حتى لا يخسر المستخدم شيئًا
				console.error("PDF merge error:", e);
				for (let i = 0; i < buffers.length; i++) {
					saveBlob(
						new Blob([buffers[i]], { type: "application/pdf" }),
						jobs[i].fileName,
					);
				}
				setPct(100);
				setPhase("done");
			} finally {
				clearInterval(timer);
			}
		})();

		return () => clearInterval(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const doneCount = states.filter((s) => s === "done").length;

	return (
		<div className="mt-8">
			{/* المؤقّت: الوقت المتبقي + الوقت المنقضي */}
			{(phase === "downloading" || phase === "merging") && (
				<div className="mb-6 text-center">
					<div
						className="font-mono text-5xl font-bold tabular-nums tracking-wider"
						style={ { color: NAVY } }
					>
						{fmt(remaining)}
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						الوقت المتوقع المتبقي • انقضى {fmt(elapsed)} •{" "}
						{phase === "merging"
							? "جارٍ دمج الأجزاء في ملف واحد..."
							: "تم تجهيز " + doneCount + "/" + jobs.length + " من الأجزاء"}
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

			{/* مراحل التجهيز: حالة كل جزء + مرحلة الدمج */}
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
							تجهيز الجزء {i + 1} — {j.count} موضوع (~
							{fmt(j.estimatedSeconds)})
						</span>
					</li>
				))}
				<li
					className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
					style={ {
						borderColor:
							phase === "done"
								? "rgba(22,163,74,.4)"
								: "rgba(212,175,55,.45)",
					} }
				>
					<span className="font-medium">
						{phase === "done" && "✅ "}
						{phase === "merging" && "⏳ "}
						{(phase === "downloading" || phase === "error") && "○ "}
						دمج الأجزاء في ملف PDF واحد ({totalCount} موضوع)
					</span>
				</li>
			</ul>

			{phase === "error" && (
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

			{phase === "done" && (
				<div className="mt-6 rounded-2xl border border-green-300 bg-green-50 p-5 text-center dark:border-green-900 dark:bg-green-950">
					<div className="text-3xl">🎉</div>
					<p className="mt-2 font-semibold text-green-700 dark:text-green-300">
						تم تحميل ملف واحد يضم {totalCount} موضوعًا في {fmt(elapsed)}
					</p>
					{blobUrl && (
						<a
							href={blobUrl}
							download={mergedFileName}
							className="mt-3 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:opacity-90"
							style={ { background: NAVY } }
						>
							⬇️ إعادة تحميل الملف
						</a>
					)}
					<p className="mt-2 text-[11px] text-muted-foreground">
						إذا لم يبدأ التحميل تلقائيًا، استخدم الزر أعلاه
					</p>
				</div>
			)}
		</div>
	);
}
