export type UniversityExamLevel = "undergraduate" | "postgraduate" | "admissions"
export type UniversityExamAccess = "public" | "restricted"

export type UniversityExamAsset = {
  year: number
  label: string
  url: string
  kind: "exam" | "solution"
}

export type UniversityExamCollection = {
  id: string
  courseCode?: string
  title: string
  titleAr: string
  subject: string
  level: UniversityExamLevel
  years: string
  languages: string[]
  archiveUrl: string
  assets?: UniversityExamAsset[]
}

export type UniversityExamSource = {
  slug: string
  shortName: string
  name: string
  nameAr: string
  descriptionAr: string
  countryCode: string
  country: string
  countryAr: string
  region: string
  city?: string
  officialUrl: string
  access: UniversityExamAccess
  copyrightNoteAr: string
  collections: UniversityExamCollection[]
}

export const UNIVERSITY_EXAM_LEVEL_LABELS: Record<UniversityExamLevel, string> = {
  undergraduate: "بكالوريوس / ليسانس",
  postgraduate: "دراسات عليا",
  admissions: "قبول جامعي",
}

export const UNIVERSITY_EXAM_ACCESS_LABELS: Record<UniversityExamAccess, string> = {
  public: "متاح للعامة",
  restricted: "قد يتطلب حساب الجامعة",
}

export const UNIVERSITY_EXAM_SUBJECT_LABELS: Record<string, string> = {
  analysis: "التحليل",
  algebra: "الجبر",
  calculus: "التفاضل والتكامل",
  "differential-equations": "المعادلات التفاضلية",
  probability: "الاحتمالات",
  statistics: "الإحصاء",
  "numerical-analysis": "التحليل العددي",
  geometry: "الهندسة",
  topology: "الطوبولوجيا",
  modeling: "النمذجة الرياضية",
  mixed: "رياضيات متنوعة",
}

export const GLOBAL_UNIVERSITY_EXAM_SOURCES: UniversityExamSource[] = [
  {
    slug: "cambridge-mathematical-tripos",
    shortName: "Cambridge",
    name: "University of Cambridge",
    nameAr: "جامعة كامبريدج",
    descriptionAr: "أرشيف Mathematical Tripos الرسمي منذ 2001، ويضم أوراق السنوات الأولى والمتوسطة والمتقدمة وبعض نماذج الحلول.",
    countryCode: "GB",
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    region: "Europe",
    city: "Cambridge",
    officialUrl: "https://www.maths.cam.ac.uk/",
    access: "public",
    copyrightNoteAr: "الملفات محفوظة الحقوق لجامعة كامبريدج؛ يعرض الموقع الروابط الرسمية فقط.",
    collections: [
      { id: "tripos-ia", title: "Mathematical Tripos Part IA", titleAr: "الرياضيات — الجزء IA", subject: "mixed", level: "undergraduate", years: "2001–2026", languages: ["English"], archiveUrl: "https://www.maths.cam.ac.uk/undergrad/pastpapers/past-ia-ib-and-ii-examination-papers" },
      { id: "tripos-ib", title: "Mathematical Tripos Part IB", titleAr: "الرياضيات — الجزء IB", subject: "mixed", level: "undergraduate", years: "2001–2026", languages: ["English"], archiveUrl: "https://www.maths.cam.ac.uk/undergrad/pastpapers/past-ia-ib-and-ii-examination-papers", assets: [
        { year: 2026, label: "Paper 1", url: "https://www.maths.cam.ac.uk/undergrad/pastpapers/files/2026/Paperib_1_2026.pdf", kind: "exam" },
        { year: 2026, label: "Paper 2", url: "https://www.maths.cam.ac.uk/undergrad/pastpapers/files/2026/Paperib_2_2026.pdf", kind: "exam" },
      ] },
      { id: "tripos-ii", title: "Mathematical Tripos Part II", titleAr: "الرياضيات — الجزء II", subject: "mixed", level: "undergraduate", years: "2001–2026", languages: ["English"], archiveUrl: "https://www.maths.cam.ac.uk/undergrad/pastpapers/past-ia-ib-and-ii-examination-papers" },
      { id: "tripos-solutions", title: "Part IA Example Solutions", titleAr: "نماذج حلول الجزء IA", subject: "analysis", level: "undergraduate", years: "2011", languages: ["English"], archiveUrl: "https://www.maths.cam.ac.uk/undergrad/pastpapers/example-ia-solutions", assets: [
        { year: 2011, label: "Analysis I — solutions", url: "https://www.maths.cam.ac.uk/undergrad/pastpapers/files/misc/analysis_i_combined.pdf", kind: "solution" },
        { year: 2011, label: "Differential Equations — solutions", url: "https://www.maths.cam.ac.uk/undergrad/pastpapers/files/misc/differential_equations_combined.pdf", kind: "solution" },
      ] },
    ],
  },
  {
    slug: "oxford-mathematics",
    shortName: "Oxford",
    name: "University of Oxford",
    nameAr: "جامعة أكسفورد",
    descriptionAr: "بوابة الأوراق الرسمية لبرامج الرياضيات في مراحل Prelims وParts A وB وC، مع حلول مختارة داخل Course Materials Hub.",
    countryCode: "GB",
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    region: "Europe",
    city: "Oxford",
    officialUrl: "https://www.maths.ox.ac.uk/",
    access: "restricted",
    copyrightNoteAr: "الفهرس رسمي؛ بعض الأوراق والحلول تتطلب حساب جامعة أكسفورد.",
    collections: [
      { id: "prelims", title: "Mathematics Prelims", titleAr: "اختبارات السنة التمهيدية", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.maths.ox.ac.uk/members/students/undergraduate-courses/examinations-assessments/past-papers" },
      { id: "parts-abc", title: "Mathematics Parts A, B and C", titleAr: "اختبارات الأجزاء A وB وC", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.maths.ox.ac.uk/members/students/undergraduate-courses/examinations-assessments/past-papers" },
      { id: "mat", title: "Mathematics Admissions Test", titleAr: "اختبار القبول MAT", subject: "mixed", level: "admissions", years: "2007–2025", languages: ["English"], archiveUrl: "https://www.maths.ox.ac.uk/study-here/undergraduate-study/maths-admissions-test/mat-past-papers" },
    ],
  },
  {
    slug: "mit-open-courseware-mathematics",
    shortName: "MIT",
    name: "Massachusetts Institute of Technology",
    nameAr: "معهد ماساتشوستس للتكنولوجيا",
    descriptionAr: "اختبارات مقررات MIT OpenCourseWare مع حلول رسمية في التفاضل والتكامل والجبر الخطي والمعادلات التفاضلية.",
    countryCode: "US",
    country: "United States",
    countryAr: "الولايات المتحدة",
    region: "North America",
    city: "Cambridge, Massachusetts",
    officialUrl: "https://ocw.mit.edu/search/?d=Mathematics",
    access: "public",
    copyrightNoteAr: "المواد منشورة رسميًا عبر MIT OpenCourseWare وتبقى خاضعة لترخيص كل مقرر.",
    collections: [
      { id: "18-01", courseCode: "18.01", title: "Single Variable Calculus", titleAr: "التفاضل والتكامل لمتغير واحد", subject: "calculus", level: "undergraduate", years: "2005 وما بعدها", languages: ["English"], archiveUrl: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2005/pages/exams" },
      { id: "18-06", courseCode: "18.06", title: "Linear Algebra", titleAr: "الجبر الخطي", subject: "algebra", level: "undergraduate", years: "2010–2011", languages: ["English"], archiveUrl: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/pages/exams" },
      { id: "18-06sc", courseCode: "18.06SC", title: "Linear Algebra — Final Exam", titleAr: "الجبر الخطي — الاختبار النهائي", subject: "algebra", level: "undergraduate", years: "2011", languages: ["English"], archiveUrl: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/pages/final-exam", assets: [
        { year: 2011, label: "Final exam solutions", url: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/03fa86c672cab6cce168955824c92f6e_MIT18_06SCF11_final_exs.pdf", kind: "solution" },
      ] },
    ],
  },
  {
    slug: "princeton-mathematics",
    shortName: "Princeton",
    name: "Princeton University",
    nameAr: "جامعة برينستون",
    descriptionAr: "أرشيف قسم الرياضيات للاختبارات والأسئلة السابقة، من حساب التفاضل الأساسي إلى حساب التفاضل متعدد المتغيرات.",
    countryCode: "US",
    country: "United States",
    countryAr: "الولايات المتحدة",
    region: "North America",
    city: "Princeton",
    officialUrl: "https://www.math.princeton.edu/",
    access: "restricted",
    copyrightNoteAr: "بعض صفحات الأسئلة عامة، بينما تتطلب أجزاء من الأرشيف Princeton NetID.",
    collections: [
      { id: "mat100", courseCode: "MAT100", title: "Foundations of Calculus", titleAr: "أساسيات التفاضل والتكامل", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://exams.math.princeton.edu/mat100" },
      { id: "mat103", courseCode: "MAT103", title: "Calculus I", titleAr: "التفاضل والتكامل 1", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://exams.math.princeton.edu/taxonomy/term/170" },
      { id: "mat104", courseCode: "MAT104", title: "Calculus II", titleAr: "التفاضل والتكامل 2", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://exams.math.princeton.edu/MAT104" },
      { id: "mat201", courseCode: "MAT201", title: "Multivariable Calculus", titleAr: "التفاضل والتكامل متعدد المتغيرات", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://exams.math.princeton.edu/mat201" },
    ],
  },
  {
    slug: "purdue-mathematics",
    shortName: "Purdue",
    name: "Purdue University",
    nameAr: "جامعة بوردو",
    descriptionAr: "أرشيف واسع لاختبارات قسم الرياضيات مع مفاتيح إجابة وحلول عند توفرها، من Calculus إلى Linear Algebra وDifferential Equations.",
    countryCode: "US",
    country: "United States",
    countryAr: "الولايات المتحدة",
    region: "North America",
    city: "West Lafayette",
    officialUrl: "https://www.math.purdue.edu/",
    access: "public",
    copyrightNoteAr: "الملفات موارد دراسية رسمية؛ تُعرض روابط الجامعة الأصلية.",
    collections: [
      { id: "ma161", courseCode: "MA16100", title: "Plane Analytic Geometry and Calculus I", titleAr: "الهندسة التحليلية والتفاضل 1", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.math.purdue.edu/academic/courses/oldexams?course=MA16100/1000" },
      { id: "ma162", courseCode: "MA16200", title: "Plane Analytic Geometry and Calculus II", titleAr: "الهندسة التحليلية والتفاضل 2", subject: "calculus", level: "undergraduate", years: "حتى 2026", languages: ["English"], archiveUrl: "https://www.math.purdue.edu/academic/courses/oldexams.php?course=MA16200" },
      { id: "ma265", courseCode: "MA26500", title: "Linear Algebra", titleAr: "الجبر الخطي", subject: "algebra", level: "undergraduate", years: "حتى 2024", languages: ["English"], archiveUrl: "https://www.math.purdue.edu/academic/courses/oldexams.php?course=MA26500", assets: [
        { year: 2024, label: "Final exam", url: "https://www.math.purdue.edu/academic/courses/past-exams/26500fe-s2024.pdf", kind: "exam" },
        { year: 2024, label: "Final answers", url: "https://www.math.purdue.edu/academic/courses/past-exams/ans-26500fe-s2024.pdf", kind: "solution" },
      ] },
      { id: "ma266", courseCode: "MA26600", title: "Ordinary Differential Equations", titleAr: "المعادلات التفاضلية العادية", subject: "differential-equations", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.math.purdue.edu/academic/courses/oldexams.php?course=MA26600" },
    ],
  },
  {
    slug: "ubc-mathematics",
    shortName: "UBC",
    name: "University of British Columbia",
    nameAr: "جامعة كولومبيا البريطانية",
    descriptionAr: "مستودع رسمي مباشر لامتحانات الرياضيات حسب رمز المادة والسنة والفصل.",
    countryCode: "CA",
    country: "Canada",
    countryAr: "كندا",
    region: "North America",
    city: "Vancouver",
    officialUrl: "https://www.math.ubc.ca/",
    access: "public",
    copyrightNoteAr: "يعرض الموقع روابط PDF الرسمية من خادم قسم الرياضيات.",
    collections: [
      { id: "math102", courseCode: "MATH 102", title: "Differential Calculus", titleAr: "التفاضل", subject: "calculus", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://secure.math.ubc.ca/Ugrad/pastExams" },
      { id: "math104", courseCode: "MATH 104/184", title: "Differential Calculus", titleAr: "التفاضل 104/184", subject: "calculus", level: "undergraduate", years: "حتى 2015", languages: ["English"], archiveUrl: "https://secure.math.ubc.ca/Ugrad/pastExams", assets: [
        { year: 2015, label: "Final exam", url: "https://secure.math.ubc.ca/Ugrad/pastExams/Files/104+184_2015WT1.pdf", kind: "exam" },
      ] },
      { id: "math303", courseCode: "MATH 303", title: "Stochastic Processes", titleAr: "العمليات العشوائية", subject: "probability", level: "undergraduate", years: "حتى 2017", languages: ["English"], archiveUrl: "https://secure.math.ubc.ca/Ugrad/pastExams", assets: [
        { year: 2017, label: "Final exam", url: "https://secure.math.ubc.ca/Ugrad/pastExams/Files/303_2016WT2.pdf", kind: "exam" },
      ] },
      { id: "math308", courseCode: "MATH 308", title: "Euclidean Geometry", titleAr: "الهندسة الإقليدية", subject: "geometry", level: "undergraduate", years: "حتى 2014", languages: ["English"], archiveUrl: "https://secure.math.ubc.ca/Ugrad/pastExams", assets: [
        { year: 2014, label: "Final exam", url: "https://secure.math.ubc.ca/Ugrad/pastExams/Files/308_2014WT1.pdf", kind: "exam" },
      ] },
    ],
  },
  {
    slug: "waterloo-mathematics",
    shortName: "Waterloo",
    name: "University of Waterloo",
    nameAr: "جامعة واترلو",
    descriptionAr: "اختبارات مقررات Calculus الرسمية واختبارات التأهيل للدكتوراه في التحليل والجبر والطوبولوجيا.",
    countryCode: "CA",
    country: "Canada",
    countryAr: "كندا",
    region: "North America",
    city: "Waterloo",
    officialUrl: "https://uwaterloo.ca/math/",
    access: "public",
    copyrightNoteAr: "تُعرض الروابط الرسمية؛ بعض المواد الحديثة قد تكون داخل منصة LEARN.",
    collections: [
      { id: "math137", courseCode: "MATH 137", title: "Calculus 1 for Honours Mathematics", titleAr: "التفاضل والتكامل 1 للرياضيات", subject: "calculus", level: "undergraduate", years: "2012 وما بعدها", languages: ["English"], archiveUrl: "https://www.math.uwaterloo.ca/~snew/MATH137/Tests/" },
      { id: "math138", courseCode: "MATH 138", title: "Calculus 2 for Honours Mathematics", titleAr: "التفاضل والتكامل 2 للرياضيات", subject: "calculus", level: "undergraduate", years: "حتى 2024", languages: ["English"], archiveUrl: "https://www.math.uwaterloo.ca/~snew/MATH138/Tests/index.html", assets: [
        { year: 2024, label: "Final exam", url: "https://www.math.uwaterloo.ca/~snew/MATH138/Tests/MATH138-Exam-F24.pdf", kind: "exam" },
        { year: 2024, label: "Final solutions", url: "https://www.math.uwaterloo.ca/~snew/MATH138/Tests/MATH138-Exam-F24-Soln.pdf", kind: "solution" },
      ] },
      { id: "phd-qualifying-analysis", title: "Pure Mathematics PhD Qualifying Exams", titleAr: "اختبارات التأهيل للدكتوراه في الرياضيات البحتة", subject: "analysis", level: "postgraduate", years: "سنوات متعددة حتى 2025", languages: ["English"], archiveUrl: "https://uwaterloo.ca/pure-mathematics/graduate-studies/current-students/phd-qualifying-examination" },
    ],
  },
  {
    slug: "toronto-mathematics",
    shortName: "Toronto",
    name: "University of Toronto",
    nameAr: "جامعة تورنتو",
    descriptionAr: "مجموعات رسمية للاختبارات القديمة في الرياضيات واختبارات شاملة للدراسات العليا.",
    countryCode: "CA",
    country: "Canada",
    countryAr: "كندا",
    region: "North America",
    city: "Toronto",
    officialUrl: "https://www.mathematics.utoronto.ca/",
    access: "public",
    copyrightNoteAr: "الوصول يمر عبر مستودع الجامعة الرقمي؛ بعض الصفحات قد تستخدم فحص المتصفح.",
    collections: [
      { id: "old-exams", title: "Mathematics Past Exams Collection", titleAr: "مجموعة اختبارات الرياضيات السابقة", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://hdl.handle.net/1807/142339" },
      { id: "comprehensive", title: "Graduate Comprehensive Exams", titleAr: "الاختبارات الشاملة للدراسات العليا", subject: "mixed", level: "postgraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.mathematics.utoronto.ca/graduate/past-comprehensive-exams" },
    ],
  },
  {
    slug: "mcgill-e-exams",
    shortName: "McGill",
    name: "McGill University",
    nameAr: "جامعة ماكغيل",
    descriptionAr: "مكتبة إلكترونية رسمية لنسخ PDF من الامتحانات النهائية المنشورة بين 2008 و2012.",
    countryCode: "CA",
    country: "Canada",
    countryAr: "كندا",
    region: "North America",
    city: "Montréal",
    officialUrl: "https://www.mcgill.ca/mathstat/",
    access: "restricted",
    copyrightNoteAr: "التوفر يختلف حسب المادة وقد يتطلب صلاحيات مكتبة الجامعة.",
    collections: [
      { id: "e-exams", title: "Electronic Final Exams", titleAr: "الاختبارات النهائية الإلكترونية", subject: "mixed", level: "undergraduate", years: "2008–2012", languages: ["English", "French"], archiveUrl: "https://www.mcgill.ca/libraries/using-libraries/course-reserves/eexams" },
    ],
  },
  {
    slug: "eth-zurich-mathematics",
    shortName: "ETH Zürich",
    name: "ETH Zürich",
    nameAr: "المعهد التقني الفدرالي في زيورخ",
    descriptionAr: "أرشيفات مقررات رسمية في التحليل والجبر والتحليل العددي مع اختبارات وحلول نموذجية.",
    countryCode: "CH",
    country: "Switzerland",
    countryAr: "سويسرا",
    region: "Europe",
    city: "Zürich",
    officialUrl: "https://math.ethz.ch/",
    access: "public",
    copyrightNoteAr: "المصادر موزعة على صفحات المقررات الرسمية لأعضاء قسم الرياضيات.",
    collections: [
      { id: "analysis-i", title: "Analysis I", titleAr: "التحليل 1", subject: "analysis", level: "undergraduate", years: "2015–2025", languages: ["German", "English"], archiveUrl: "https://people.math.ethz.ch/~asteiger/teaching" },
      { id: "analysis-ii", title: "Analysis II", titleAr: "التحليل 2", subject: "analysis", level: "undergraduate", years: "2018–2026", languages: ["German", "English"], archiveUrl: "https://people.math.ethz.ch/~asteiger/teaching" },
      { id: "analysis-iii", title: "Analysis III — Measure Theory", titleAr: "التحليل 3 — نظرية القياس", subject: "analysis", level: "undergraduate", years: "2023–2025", languages: ["English"], archiveUrl: "https://metaphor.ethz.ch/x/2025/hs/401-2283-00L/ex/", assets: [
        { year: 2023, label: "Exam", url: "https://metaphor.ethz.ch/x/2025/hs/401-2283-00L/ex/exam2023.pdf", kind: "exam" },
      ] },
      { id: "old-exams", title: "Mathematics Old Exams", titleAr: "أرشيف الاختبارات القديمة", subject: "mixed", level: "undergraduate", years: "حتى 2026", languages: ["German", "English"], archiveUrl: "https://people.math.ethz.ch/~gruppe3/exams_archive" },
    ],
  },
  {
    slug: "epfl-mathematics",
    shortName: "EPFL",
    name: "École polytechnique fédérale de Lausanne",
    nameAr: "المدرسة الاتحادية للفنون التطبيقية في لوزان",
    descriptionAr: "فهرس مقررات الرياضيات الرسمي وروابط موارد مقررات في التحليل والجبر والطوبولوجيا والتحليل العددي.",
    countryCode: "CH",
    country: "Switzerland",
    countryAr: "سويسرا",
    region: "Europe",
    city: "Lausanne",
    officialUrl: "https://www.epfl.ch/schools/sb/research/math/",
    access: "public",
    copyrightNoteAr: "الاختبارات ليست مركزية دائمًا؛ ترتبط المواد بصفحات المقررات الرسمية.",
    collections: [
      { id: "analysis", title: "Analysis I–IV", titleAr: "التحليل 1–4", subject: "analysis", level: "undergraduate", years: "سنوات متعددة", languages: ["French", "English"], archiveUrl: "https://www.epfl.ch/education/international/en/coming-to-epfl/semester-courses/studies/english-bachelor-courses/mathematics/" },
      { id: "algebra", courseCode: "MATH-310", title: "Algebra", titleAr: "الجبر", subject: "algebra", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://edu.epfl.ch/coursebook/en/algebra-MATH-310" },
      { id: "numerical-analysis", courseCode: "MATH-456", title: "Numerical Analysis and Computational Mathematics", titleAr: "التحليل العددي والرياضيات الحاسوبية", subject: "numerical-analysis", level: "postgraduate", years: "2026–2027", languages: ["English"], archiveUrl: "https://edu.epfl.ch/coursebook/en/numerical-analysis-and-computational-mathematics-MATH-456" },
    ],
  },
  {
    slug: "trinity-college-dublin",
    shortName: "Trinity Dublin",
    name: "Trinity College Dublin",
    nameAr: "كلية ترينيتي دبلن",
    descriptionAr: "بوابة الجامعة الرسمية لأوراق الاختبارات السنوية واختبارات Foundation Scholarship في الرياضيات.",
    countryCode: "IE",
    country: "Ireland",
    countryAr: "إيرلندا",
    region: "Europe",
    city: "Dublin",
    officialUrl: "https://www.maths.tcd.ie/",
    access: "public",
    copyrightNoteAr: "تُعرض الروابط الرسمية للأوراق؛ قد تستخدم بعض الملفات SharePoint.",
    collections: [
      { id: "annual", title: "Annual Mathematics Exam Papers", titleAr: "أوراق اختبارات الرياضيات السنوية", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.tcd.ie/academicregistry/exams/past-papers/annual/" },
      { id: "foundation-scholarship", title: "Foundation Scholarship Mathematics", titleAr: "اختبارات منحة Foundation في الرياضيات", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.maths.tcd.ie/undergraduate/foundation-scholarship/" },
    ],
  },
  {
    slug: "university-college-dublin",
    shortName: "UCD",
    name: "University College Dublin",
    nameAr: "كلية دبلن الجامعية",
    descriptionAr: "بوابة الجامعة للأوراق السابقة، مع مجموعات عامة محددة في الرياضيات التطبيقية والأرصاد.",
    countryCode: "IE",
    country: "Ireland",
    countryAr: "إيرلندا",
    region: "Europe",
    city: "Dublin",
    officialUrl: "https://www.ucd.ie/courses/mathematics",
    access: "restricted",
    copyrightNoteAr: "الأرشيف المركزي يتطلب حساب طالب حالي، لكن بعض أقسام الرياضيات تنشر أوراقًا عامة.",
    collections: [
      { id: "central", title: "UCD Past Exam Papers", titleAr: "أوراق الاختبارات السابقة", subject: "mixed", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://www.ucd.ie/students/exams/examinationsinformation/pastpapers/" },
      { id: "meteorology", title: "Mathematical Meteorology Exam Papers", titleAr: "اختبارات الرياضيات والأرصاد", subject: "modeling", level: "postgraduate", years: "2004–2005", languages: ["English"], archiveUrl: "https://maths.ucd.ie/met/msc/Exam-Papers/" },
    ],
  },
  {
    slug: "warwick-mathematics",
    shortName: "Warwick",
    name: "University of Warwick",
    nameAr: "جامعة ووريك",
    descriptionAr: "فهرس اختبارات مقررات الرياضيات حسب رمز المادة، من التحليل إلى النمذجة والمجموعات والأعداد.",
    countryCode: "GB",
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    region: "Europe",
    city: "Coventry",
    officialUrl: "https://warwick.ac.uk/fac/sci/maths/",
    access: "restricted",
    copyrightNoteAr: "صفحات المقررات عامة، لكن تنزيل بعض أوراق الاختبار قد يخضع لصلاحيات الجامعة.",
    collections: [
      { id: "ma138", courseCode: "MA138", title: "Sets and Numbers", titleAr: "المجموعات والأعداد", subject: "algebra", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://warwick.ac.uk/exampapers?q=MA138" },
      { id: "ma140", courseCode: "MA140", title: "Mathematical Analysis 1", titleAr: "التحليل الرياضي 1", subject: "analysis", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://warwick.ac.uk/exampapers?q=MA140" },
      { id: "ma139", courseCode: "MA139", title: "Analysis 2", titleAr: "التحليل 2", subject: "analysis", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://warwick.ac.uk/exampapers?q=MA139" },
      { id: "ma146", courseCode: "MA146", title: "Methods of Mathematical Modelling 1", titleAr: "طرائق النمذجة الرياضية 1", subject: "modeling", level: "undergraduate", years: "سنوات متعددة", languages: ["English"], archiveUrl: "https://warwick.ac.uk/exampapers?q=MA146" },
    ],
  },
  {
    slug: "edinburgh-mathematics",
    shortName: "Edinburgh",
    name: "University of Edinburgh",
    nameAr: "جامعة إدنبرة",
    descriptionAr: "مكتبة رسمية لأوراق الدرجات الجامعية منذ 2004، مع صفحات مقررات تنشر أوراقًا وحلولًا مختارة.",
    countryCode: "GB",
    country: "United Kingdom",
    countryAr: "المملكة المتحدة",
    region: "Europe",
    city: "Edinburgh",
    officialUrl: "https://www.maths.ed.ac.uk/",
    access: "restricted",
    copyrightNoteAr: "الوصول المركزي مخصص للطلاب والموظفين؛ بعض صفحات المقررات عامة.",
    collections: [
      { id: "library", title: "Degree Examination Papers", titleAr: "أوراق اختبارات الدرجات الجامعية", subject: "mixed", level: "undergraduate", years: "2004–2026", languages: ["English"], archiveUrl: "https://library.ed.ac.uk/exam-papers" },
      { id: "scdaa", title: "Stochastic Control and Dynamic Asset Allocation", titleAr: "التحكم العشوائي وتخصيص الأصول", subject: "probability", level: "postgraduate", years: "2023–2024", languages: ["English"], archiveUrl: "https://webhomes.maths.ed.ac.uk/~dsiska/scdaa_2024-25" },
    ],
  },
  {
    slug: "auckland-mathematics",
    shortName: "Auckland",
    name: "University of Auckland",
    nameAr: "جامعة أوكلاند",
    descriptionAr: "مجموعة مكتبة الجامعة التي تضم أكثر من سبعة آلاف ورقة من السنوات الست الأخيرة، مع أمثلة عامة من قسم الرياضيات.",
    countryCode: "NZ",
    country: "New Zealand",
    countryAr: "نيوزيلندا",
    region: "Oceania",
    city: "Auckland",
    officialUrl: "https://www.math.auckland.ac.nz/",
    access: "restricted",
    copyrightNoteAr: "المجموعة المركزية تتطلب حساب الجامعة؛ صفحات الأمثلة العامة تبقى متاحة للجميع.",
    collections: [
      { id: "library", title: "University Past Exam Papers", titleAr: "أوراق اختبارات الجامعة السابقة", subject: "mixed", level: "undergraduate", years: "آخر 6 سنوات", languages: ["English"], archiveUrl: "https://www.auckland.ac.nz/en/library/use-our-collections/past-exam-papers.html" },
      { id: "samples", title: "Mathematics Example Exam Papers", titleAr: "نماذج اختبارات قسم الرياضيات", subject: "mixed", level: "undergraduate", years: "نماذج متعددة", languages: ["English"], archiveUrl: "https://www.math.auckland.ac.nz/Teaching/Samples/" },
    ],
  },
]

export function getUniversityExamSource(slug: string) {
  return GLOBAL_UNIVERSITY_EXAM_SOURCES.find((source) => source.slug === slug) ?? null
}
