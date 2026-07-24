import { redirect, notFound } from "next/navigation";
import { isSuperAdmin, loadNotebook } from "@/lib/notebooks";
import BookClient from "./book-client";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function NotebookBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isSuperAdmin())) redirect("/");

  const { id } = await params;
  const notebook = await loadNotebook(id);
  if (!notebook) notFound();

  return <BookClient notebook={notebook} />;
}
