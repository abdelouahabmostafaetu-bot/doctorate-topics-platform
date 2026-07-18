// هيكل تحميل صفحة البحث — شكل الفلاتر + قائمة النتائج
export default function LoadingSearch() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-8">
      <div className="h-6 w-40 rounded-lg bg-muted" />
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-9 w-36 rounded-lg bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
