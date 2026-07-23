// صفحة التحميل الاحترافية — شعار + مؤقّت + مراحل (للأعضاء المسجلين فقط)
// تدعم الآن تحميل "كل" المواضيع المطابقة للفلاتر على أجزاء متتالية مع مؤقّت زمني
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DownloadRunner } from "@/components/download-runner";
import {
	MultiDownloadRunner,
	type BulkJob,
} from "@/components/multi-download-runner";
import { SupportBanner } from "@/components/support-banner";
import {
	buildBulkWhere,
	estimateSeconds,
	MAX_BULK,
	partsCount,
} from "@/lib/pdf/bulk-filters";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "تحميل PDF — منصة مواضيع دكتوراه الرياضيات",
};

const NAVY = "#163a70";
const GOLD = "#d4af37";

function Logo() {
	return (
		<div className="flex flex-col items-center">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/logo-light.png"
				alt="Doc Math DZ"
				className="h-20 w-auto dark:hidden"
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src="/logo-dark.png"
				alt="Doc Math DZ"
				className="hidden h-20 w-auto dark:block"
			/>
			<div
				className="mt-3 h-0.5 w-40"
				style={ {
					background:
						"linear-gradient(90deg, transparent, " + GOLD + ", transparent)",
				} }
			/>
			<p
				className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
				style={ { color: NAVY } }
			>
				docmathdz.dev
			</p>
		</div>
	);
}

type SP = {
	slug?: string;
	q?: string;
	university?: string;
	specialty?: string;
	year?: string;
	examType?: string;
	difficulty?: string;
};

function fmtDuration(sec: number): string {
	const m = Math.floor(sec / 60);
	const r = Math.round(sec % 60);
	if (m === 0) return r + " ثانية";
	if (r === 0) return m + " دقيقة";
	return m + " د و " + r + " ث";
}

export default async function DownloadPage({
	searchParams,
}: {
	searchParams: Promise<SP>;
}) {
	const sp = await searchParams;
	const session = await auth();

	// التحميل للأعضاء فقط — غير متاح للزوار
	if (!session?.user?.id) {
		return (
			<div className="mx-auto max-w-md px-4 py-20">
				<div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
					<Logo />
					<div className="mt-6 text-5xl">🔒</div>
					<h1 className="mt-4 text-xl font-bold">التحميل للأعضاء فقط</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						تحميل المواضيع بصيغة PDF متاح للمستخدمين المسجلين
						بحساباتهم فقط. التسجيل مجاني تمامًا 🌱
					</p>
					<div className="mt-6 flex justify-center gap-3">
						<Link
							href="/signin"
							className="rounded-md px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
							style={ { background: NAVY } }
						>
							تسجيل الدخول
						</Link>
						<Link
							href="/signup"
							className="rounded-md border px-5 py-2 text-sm transition hover:border-primary hover:text-primary"
						>
							إنشاء حساب
						</Link>
					</div>
				</div>
			</div>
		);
	}

	let title: string;
	let subtitle: string;
	let backHref = "/search";
	let single: { apiUrl: string; fileName: string } | null = null;
	let jobs: BulkJob[] = [];
	let totalEstimated = 0;

	if (sp.slug) {
		// تحميل موضوع واحد
		const topic = await prisma.topic.findUnique({
			where: { slug: sp.slug },
			include: { university: true },
		});
		if (!topic || topic.status !== "published") notFound();
		title =
			"مسابقة دكتوراه " + topic.year + " — " + topic.university.nameAr;
		subtitle = "موضوع واحد • بدون حلول • قالب مسابقة رسمي A4";
		single = {
			apiUrl: "/api/pdf/topic/" + topic.slug,
			fileName: "sujet-doctorat-" + topic.slug + ".pdf",
		};
		totalEstimated = estimateSeconds(1);
		backHref = "/topics/" + topic.slug;
	} else {
		// تحميل جماعي حسب فلاتر البحث — كل المواضيع المطابقة بدون سقف
		const where = buildBulkWhere(sp);
		const total = await prisma.topic.count({ where });
		if (total === 0) {
			return (
				<div className="mx-auto max-w-md px-4 py-20 text-center">
					<div className="rounded-2xl border bg-card p-8 shadow-sm">
						<Logo />
						<div className="mt-6 text-5xl">📭</div>
						<h1 className="mt-4 text-xl font-bold">لا توجد مواضيع مطابقة</h1>
						<Link
							href="/search"
							className="mt-6 inline-block rounded-md px-5 py-2 text-sm font-medium text-white"
							style={ { background: NAVY } }
						>
							العودة للبحث
						</Link>
					</div>
				</div>
			);
		}

		const totalParts = partsCount(total);
		const params = new URLSearchParams();
		if (sp.q) params.set("q", sp.q);
		if (sp.university) params.set("university", sp.university);
		if (sp.specialty) params.set("specialty", sp.specialty);
		if (sp.year) params.set("year", sp.year);
		if (sp.examType) params.set("examType", sp.examType);
		if (sp.difficulty) params.set("difficulty", sp.difficulty);

		jobs = Array.from({ length: totalParts }, (_, i) => {
			const part = i + 1;
			const count =
				part < totalParts ? MAX_BULK : total - (totalParts - 1) * MAX_BULK;
			const p = new URLSearchParams(params);
			if (totalParts > 1) p.set("part", String(part));
			const qs = p.toString();
			return {
				apiUrl: "/api/pdf/bulk" + (qs ? "?" + qs : ""),
				fileName:
					totalParts > 1
						? "recueil-doctorat-partie-" +
							part +
							"-de-" +
							totalParts +
							"-" +
							count +
							"-sujets.pdf"
						: "recueil-doctorat-" + count + "-sujets.pdf",
				count,
				estimatedSeconds: estimateSeconds(count),
			};
		});
		totalEstimated = jobs.reduce((s, j) => s + j.estimatedSeconds, 0);

		title =
			"رزمة مواضيع PDF — " +
			total +
			" موضوع" +
			(totalParts > 1 ? " (" + totalParts + " أجزاء)" : "");
		subtitle =
			"غلاف مصوّر + فهرس منظم (سنة ← تخصص ← جامعة) • بدون حلول • كل موضوع في صفحة مستقلة";
	}

	return (
		<div className="mx-auto max-w-lg px-4 py-14">
			<div
				className="overflow-hidden rounded-2xl border bg-card shadow-md"
				style={ { borderColor: "rgba(22,58,112,.25)" } }
			>
				{/* شريط علوي بهوية الكتاب */}
				<div
					className="h-1.5 w-full"
					style={ {
						background:
							"linear-gradient(90deg, " + NAVY + ", " + GOLD + ", " + NAVY + ")",
					} }
				/>
				<div className="p-8 text-center">
					<Logo />

					<h1 className="mt-6 text-xl font-bold" style={ { color: NAVY } }>
						{title}
					</h1>
					<p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>

					{/* الوقت التقديري للتحميل */}
					<p
						className="mt-3 inline-block rounded-full border px-4 py-1.5 text-xs font-semibold"
						style={ { borderColor: "rgba(212,175,55,.5)", color: NAVY } }
					>
						⏱️ الوقت التقديري للتحميل: ≈ {fmtDuration(totalEstimated)}
					</p>

					{jobs.length > 1 && (
						<p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200">
							📦 سيتم تحميل كل المواضيع على {jobs.length} أجزاء متتالية (كل
							جزء حتى {MAX_BULK} موضوعًا) — اترك الصفحة مفتوحة حتى اكتمال
							جميع الملفات
						</p>
					)}

					<SupportBanner />

					{single ? (
						<DownloadRunner
							apiUrl={single.apiUrl}
							fileName={single.fileName}
							estimatedSeconds={totalEstimated}
						/>
					) : jobs.length === 1 ? (
						<DownloadRunner
							apiUrl={jobs[0].apiUrl}
							fileName={jobs[0].fileName}
							estimatedSeconds={jobs[0].estimatedSeconds}
						/>
					) : (
						<MultiDownloadRunner jobs={jobs} />
					)}

					<Link
						href={backHref}
						className="mt-6 inline-block text-sm text-muted-foreground transition hover:text-primary"
					>
						→ الرجوع
					</Link>
				</div>
				{/* تذييل بهوية الموقع */}
				<div
					className="border-t px-8 py-3 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
					style={ { borderColor: "rgba(212,175,55,.35)" } }
				>
					Partager le savoir • Encourager la recherche • Bâtir l’avenir
				</div>
			</div>
		</div>
	);
}
