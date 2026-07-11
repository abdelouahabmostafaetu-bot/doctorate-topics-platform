/** المدة الافتراضية: عامة 1س30د = 90، تخصص 3س = 180 */
export function durationFromExamType(examType: string): number {
  return examType === "specialty" ? 180 : 90;
}
