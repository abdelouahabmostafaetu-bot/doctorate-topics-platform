// أنواع محرك المكتبة — كتب الرياضيات الحديثة فقط (>= 2004)
// لا تلمس هذه الملفات مكتبة الكتب اليدوية الحالية (LibraryBook) إطلاقًا.

export type CategoryId =
	| "logic"
	| "algebra"
	| "analysis"
	| "pde"
	| "geometry"
	| "probability"
	| "numerical"
	| "discrete"
	| "optimization"
	| "mathphysics"
	| "computing"
	| "finance"
	| "biomath"
	| "history";

/** المستوى الدراسي حسب النظام الجزائري (LMD) */
export type Level = "licence" | "master" | "doctorat";

export type BookKind =
	| "textbook" // كتاب منهجي
	| "monograph" // مرجع متخصص
	| "proceedings" // أعمال مؤتمر
	| "lecture-notes" // مذكرات محاضرات
	| "reference"; // موسوعة / مرجع عام

/**
 * حالة الوصول:
 * - open          : مفتوح ومرخّص — يجوز حفظ نسخة وتقديم زر تحميل
 * - external      : ملف مفتوح لكن يُقرأ عند الناشر فقط (لا ننسخه)
 * - metadata-only : كتاب تجاري — بيانات وصفية ورابط رسمي فقط، بلا أي رابط تحميل
 */
export type Access = "open" | "external" | "metadata-only";

export type CoverKind = "publisher" | "openlibrary" | "pdf-page" | "generated";

export type ClassifiedBy =
	| "msc"
	| "arxiv"
	| "openalex"
	| "keyword"
	| "manual";

/** سجل خام كما يعود من أي حاصد قبل التطبيع والتصنيف */
export type RawItem = {
	source: string; // "springer" | "doab" | "hal" | "zbmath" ...
	sourceId?: string;
	type: string; // نوع السجل كما ورد من المصدر
	title?: string;
	subtitle?: string;
	authors?: string[];
	year?: number;
	publisher?: string;
	series?: string;
	edition?: string;
	isbn13?: string;
	doi?: string;
	language?: string;
	abstract?: string;
	pageCount?: number;
	landingUrl?: string;
	pdfUrl?: string;
	coverUrl?: string;
	license?: string;
	mscCodes?: string[];
	arxivCategories?: string[];
	openalexTopics?: Array<{ id: string; display_name?: string }>;
};

/** السجل النهائي المخزّن والمفهرس */
export type LibraryItem = {
	canonicalKey: string;
	slug: string;

	title: string;
	subtitle?: string;
	titleNorm: string;
	authors: string[];
	year: number; // دائمًا >= MIN_YEAR
	publisher?: string;
	series?: string;
	edition?: string;
	isbn13?: string;
	doi?: string;
	language: string;
	abstract?: string;
	pageCount?: number;

	// التصنيف
	category: CategoryId;
	subtopics: string[];
	mscCodes: string[];
	level?: Level;
	bookKind?: BookKind;
	classifiedBy: ClassifiedBy;
	confidence: number;

	// الوصول
	access: Access;
	landingUrl: string;
	pdfUrl?: string;
	pdfMirrored?: string;
	pdfStatus?: "ok" | "dead";
	pdfCheckedAt?: Date;
	license?: string;

	// الغلاف
	coverUrl?: string;
	coverKind: CoverKind;

	// الجودة والحوكمة
	qualityScore: number;
	publisherTier: 1 | 2 | 3;
	sources: string[];
	harvestedAt: Date;
	updatedAt: Date;
};

export type Category = {
	id: CategoryId;
	ar: string;
	fr: string;
	msc: string[]; // رموز MSC من خانتين
	arxiv: string[];
	subtopics: string[];
};
