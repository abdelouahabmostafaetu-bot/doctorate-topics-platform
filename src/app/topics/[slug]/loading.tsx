// هيكل تحميل صفحة الموضوع — العنوان + الأزرار + نص التمارين
export default function LoadingTopic() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8">
      <div className="h-7 w-3/4 rounded-lg bg-muted" />
      <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-24 rounded-full bg-muted" />
        ))}
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-11/12 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="mt-6 h-5 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-10/12 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}
