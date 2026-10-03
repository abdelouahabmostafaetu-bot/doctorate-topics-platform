import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function UniversityExamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = (await auth())?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/");
  return children;
}