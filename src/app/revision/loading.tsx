// هيكل تحميل صفحة مراجعتي — البطاقات والأقسام
export default function LoadingRevision() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8">
      <div className="h-6 w-32 rounded-lg bg-muted" />
      <div className="mt-4 h-20 rounded-xl bg-muted" />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="h-28 rounded-xl bg-muted" />
        <div className="h-28 rounded-xl bg-muted" />
      </div>
      <div className="mt-7 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
