/** Exam duration in minutes from competition type. */
export function durationMinutesForExamType(
  examType: string | null | undefined,
): number {
  return examType === "specialty" ? 180 : 90;
}

export function durationLabelForExamType(
  examType: string | null | undefined,
): string {
  return examType === "specialty" ? "3 ساعات" : "1 ساعة و 30 دقيقة";
}
