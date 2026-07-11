import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 🎲 موضوع عشوائي — يختار موضوعًا منشورًا عشوائيًا ويحوّل إليه
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const count = await prisma.topic.count({ where: { status: "published" } });
  if (count === 0) {
    return NextResponse.redirect(new URL("/search", request.url));
  }

  const skip = Math.floor(Math.random() * count);
  const topic = await prisma.topic.findFirst({
    where: { status: "published" },
    skip,
    select: { slug: true },
  });

  return NextResponse.redirect(
    new URL(topic ? `/topics/${topic.slug}` : "/search", request.url),
  );
}
