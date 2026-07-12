// صفحة الانتظار والتحميل — للأعضاء المسجلين فقط (FR: téléchargement PDF)
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DownloadRunner } from "@/components/download-runner";
import { buildBulkWhere, MAX_BULK } from "@/lib/pdf/bulk-filters";

export const dynamic = "force-dynamic";

export const metadata = {
	title: "تحميل PDF — منصة مواضيع دكتوراه الرياضيات",
};

type SP = {
	slug?: string;
	q?: string;
	university?: string;
	specialty?: string;
	year?: string;
	examType?: string;
	difficulty?: string;
};

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
					<div className="text-5xl">🔒</div>
					<h1 className="mt-4 text-xl font-bold">التحميل للأعضاء فقط</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						تحميل المواضيع بصيغة PDF متاح للمستخدمين المسجلين
						بحساباتهم فقط. التسجيل مجاني تمامًا 🌱
					</p>
					<div className="mt-6 flex justify-center gap-3">
						<Link
							href="/signin"
							className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
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
	let apiUrl: string;
	let fileName: string;
	let count: number;
	let capped = false;
	let backHref = "/search";

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
		apiUrl = "/api/pdf/topic/" + topic.slug;
		fileName = "sujet-doctorat-" + topic.slug + ".pdf";
		count = 1;
		backHref = "/topics/" + topic.slug;
	} else {
		// تحميل جماعي حسب فلاتر البحث
		const where = buildBulkWhere(sp);
		const total = await prisma.topic.count({ where });
		if (total === 0) {
			return (
				<div className="mx-auto max-w-md px-4 py-20 text-center">
					<div className="rounded-2xl border bg-card p-8 shadow-sm">
						<div className="text-5xl">📭</div>
						<h1 className="mt-4 text-xl font-bold">لا توجد مواضيع مطابقة</h1>
						<Link
							href="/search"
							className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
						>
							العودة للبحث
						</Link>
					</div>
				</div>
			);
		}
		count = Math.min(total, MAX_BULK);
		capped = total > MAX_BULK;
		title = "رزمة مواضيع PDF — " + count + " موضوع";
		subtitle =
			"غلاف + فهرس منظم (سنة ← تخصص ← جامعة) • بدون حلول • كل موضوع في صفحة مستقلة";
		const params = new URLSearchParams();
		if (sp.q) params.set("q", sp.q);
		if (sp.university) params.set("university", sp.university);
		if (sp.specialty) params.set("specialty", sp.specialty);
		if (sp.year) params.set("year", sp.year);
		if (sp.examType) params.set("examType", sp.examType);
		if (sp.difficulty) params.set("difficulty", sp.difficulty);
		apiUrl = "/api/pdf/bulk?" + params.toString();
		fileName = "recueil-doctorat-" + count + "-sujets.pdf";
	}

	// تقدير المدة: إقلاع المتصفح السحابي + زمن لكل موضوع
	const estimatedSeconds =
		count === 1 ? 20 : Math.min(55, 15 + Math.ceil(count * 1.3));

	return (
		<div className="mx-auto max-w-lg px-4 py-16">
			<div className="rounded-2xl border bg-gradient-to-b from-primary/10 to-card p-8 text-center shadow-sm">
				<div className="text-5xl">📄</div>
				<h1 className="mt-4 text-xl font-bold">{title}</h1>
				<p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

				<div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
					<span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
						📚 {count} {count === 1 ? "موضوع" : "موضوع"}
					</span>
					<span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
						🚫 بدون حلول
					</span>
					<span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
						✒️ تنسيق LaTeX احترافي
					</span>
				</div>

				{capped && (
					<p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
						⚠️ النتائج أكثر من {MAX_BULK} — سيتضمن الملف أول {MAX_BULK}{" "}
						موضوعًا. ضيّق الفلاتر لتحميل البقية.
					</p>
				)}

				<DownloadRunner
					apiUrl={apiUrl}
					fileName={fileName}
					estimatedSeconds={estimatedSeconds}
				/>

				<Link
					href={backHref}
					className="mt-6 inline-block text-sm text-muted-foreground transition hover:text-primary"
				>
					→ الرجوع
				</Link>
			</div>
		</div>
	);
}
