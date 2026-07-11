import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [universities, specialties] = await Promise.all([
    prisma.university.findMany({
      orderBy: { nameAr: "asc" },
      select: { nameAr: true },
    }),
    prisma.specialty.findMany({
      orderBy: { nameAr: "asc" },
      select: { nameAr: true },
    }),
  ]);
  return NextResponse.json({
    universities: universities.map((u) => u.nameAr).filter(Boolean),
    specialties: specialties.map((s) => s.nameAr).filter(Boolean),
  });
}
