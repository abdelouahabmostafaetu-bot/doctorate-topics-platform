// قراءة آمنة لحقل polished (Json) المخزّن في الموضوع
export type PolishedProblem = {
  problemNumber: number;
  statement?: string | null;
  solution?: string | null;
  remark?: string | null;
};

export function readPolished(value: unknown): PolishedProblem[] {
  if (!value || typeof value !== "object") return [];
  const arr = (value as { problems?: unknown }).problems;
  return Array.isArray(arr) ? (arr as PolishedProblem[]) : [];
}
