"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminUniversityExamsButton() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setIsAdmin(data?.isAdmin === true);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/university-exams"
      className="group flex items-center gap-2.5 rounded-full border border-indigo-400/50 bg-white px-5 py-2.5 font-medium text-indigo-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/15 dark:bg-transparent dark:text-indigo-400"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-sm transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-[12deg]">
        📝
      </span>
      اختبارات جامعية
    </Link>
  );
}