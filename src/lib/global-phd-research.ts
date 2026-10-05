import researchBatch from "@/data/global-phd-exams-batch-001.json";

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

export const GLOBAL_PHD_RESEARCH_BATCH = {
  report: researchBatch.researchReport,
  exams: researchBatch.exams as VerifiedPhdExam[],
};

export function getVerifiedPhdExam(index: number) {
  return GLOBAL_PHD_RESEARCH_BATCH.exams[index] ?? null;
}