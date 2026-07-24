import { redirect } from "next/navigation";
import { isSuperAdmin, listNotebooks } from "@/lib/notebooks";
import NotebooksClient from "./notebooks-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "كرّاريسي",
  robots: { index: false, follow: false },
};

export default async function NotebooksPage() {
  if (!(await isSuperAdmin())) redirect("/");

  const notebooks = await listNotebooks();

  return <NotebooksClient initial={notebooks} />;
}
