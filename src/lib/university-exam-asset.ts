import { getUniversityExamSource } from "@/data/university-exams";

export function findUniversityExamAsset(slug: string, collectionId: string, index: string, subject?: string) {
  const source = getUniversityExamSource(slug);
  const collection = source?.collections.find((item) => item.id === collectionId && (!subject || item.subject === subject));
  const assetIndex = /^(0|[1-9]\d*)$/.test(index) ? Number(index) : -1;
  const asset = Number.isSafeInteger(assetIndex) && assetIndex >= 0 ? collection?.assets?.[assetIndex] : undefined;
  return { source, collection, asset };
}
