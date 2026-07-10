import Link from "next/link";
import type { Prisma } from "@prisma/client";

export type TopicWithRefs = Prisma.TopicGetPayload<{
  include: { university: true; specialty: true };
}>;

const examTypeLabel: Record<string, string> = {
  general: "مسابقة عامة",
  specialty: "مسابقة تخصص",
};

export function TopicCard({ topic }: { topic: TopicWithRefs }) {
  const duration = topic.durationMinutes
    ? `${Math.floor(topic.durationMinutes / 60)}سا${topic.durationMinutes % 60 ? ` ${topic.durationMinutes % 60}د` : ""}`
    : null;
  return (
    <Link
      href={`/topics/${topic.slug}`}
      className="block rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="rounded-md bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
          {topic.year}
        </span>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
          {examTypeLabel[topic.examType] ?? topic.examType}
          {topic.examNumber != null &&
            ` — موضوع ${String(topic.examNumber).padStart(2, "0")}`}
        </span>
      </div>
      <h3 className="mt-3 font-semibold leading-snug">
        {topic.university.nameAr}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {topic.specialty.nameAr} · {topic.problems.length} تمارين
        {topic.coefficient != null && ` · معامل ${topic.coefficient}`}
        {duration && ` · ${duration}`}
      </p>
    </Link>
  );
}
