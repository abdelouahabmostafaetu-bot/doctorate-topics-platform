import { redirect, notFound } from "next/navigation";
import { isSuperAdmin, loadNotebook } from "@/lib/notebooks";
import DownloadClient from "./download-client";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NotebookDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isSuperAdmin())) redirect("/");

  const { id } = await params;
  const nb = await loadNotebook(id);
  if (!nb) notFound();

  return (
    <DownloadClient
      id={nb.id}
      title={nb.title}
      subtitle={nb.subtitle}
      color={nb.color}
      pages={nb.pages.map((p) => ({
        number: p.number,
        title: p.title,
        chars: p.content.length,
      }))}
    />
  );
}
