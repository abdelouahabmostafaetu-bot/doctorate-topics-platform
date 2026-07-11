"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-2xl font-bold">عذرًا، حدث خطأ في الموقع</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Digest: {error.digest || "غير معروف"}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          إعادة المحاولة
        </button>
        <Link href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
          الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
