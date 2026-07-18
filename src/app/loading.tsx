// هيكل تحميل عام — يظهر فورًا أثناء تجهيز أي صفحة (استجابة محسوسة أسرع)
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-10">
      <div className="mx-auto h-8 w-2/3 rounded-lg bg-muted" />
      <div className="mx-auto mt-4 h-4 w-1/2 rounded bg-muted" />
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
