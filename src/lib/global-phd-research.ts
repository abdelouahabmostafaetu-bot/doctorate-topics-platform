import researchBatchOne from "@/data/global-phd-exams-batch-001.json";
import researchBatchTwo from "@/data/global-phd-exams-batch-002.json";
import researchBatchThree from "@/data/global-phd-exams-batch-003.json";
import researchBatchFour from "@/data/global-phd-exams-batch-004.json";
import researchBatchFive from "@/data/global-phd-exams-batch-005.json";
import researchBatchSix from "@/data/global-phd-exams-batch-006.json";
import researchBatchSeven from "@/data/global-phd-exams-batch-007.json";

export type VerifiedPhdExam = {
  countryCode: string;
  country: string;
  countryAr: string;
  university: string;
  universityAr: string;
  department: string;
  specialty: string;
  specialtyAr: string;
  year: number;
  examType: "general" | "specialty";
  examNumber: number;
  title: string;
  titleAr: string;
  durationMinutes: number | null;
  coefficient: number | null;
  language: string;
  pdfUrl: string;
  sourceUrl: string;
  officialDomain: string;
  fileName: string;
  generateReader: boolean;
};

export const GLOBAL_PHD_RESEARCH_BATCHES = [
  {
    report: researchBatchOne.researchReport,
    exams: researchBatchOne.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchTwo.researchReport,
    exams: researchBatchTwo.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchThree.researchReport,
    exams: researchBatchThree.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchFour.researchReport,
    exams: researchBatchFour.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchFive.researchReport,
    exams: researchBatchFive.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchSix.researchReport,
    exams: researchBatchSix.exams as VerifiedPhdExam[],
  },
  {
    report: researchBatchSeven.researchReport,
    exams: researchBatchSeven.exams as VerifiedPhdExam[],
  },
];

export const GLOBAL_PHD_RESEARCH_BATCH = {
  report: {
    batch: GLOBAL_PHD_RESEARCH_BATCHES.map((item) => item.report.batch).join(
      "–",
    ),
    searchedAt:
      GLOBAL_PHD_RESEARCH_BATCHES.at(-1)?.report.searchedAt ||
      researchBatchOne.researchReport.searchedAt,
  },
  exams: GLOBAL_PHD_RESEARCH_BATCHES.flatMap((item) => item.exams),
};

export function getVerifiedPhdExam(index: number) {
  return GLOBAL_PHD_RESEARCH_BATCH.exams[index] ?? null;
}