import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

async function visitorId() {
  const store = await cookies();
  const existing = store.get("docmath_story_visitor")?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "like" && action !== "view")
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const story = await prisma.successStory.findFirst({
    where: { slug, published: true },
    select: { id: true },
  });
  if (!story)
    return NextResponse.json({ error: "التجربة غير موجودة" }, { status: 404 });

  const visitor = await visitorId();
  let likes: number | undefined;
  let views: number | undefined;
  let liked = false;

  if (action === "like") {
    const duplicate = await prisma.successStoryLike.findUnique({
      where: {
        storyId_visitorId: { storyId: story.id, visitorId: visitor.id },
      },
    });
    if (!duplicate)
      await prisma.successStoryLike.create({
        data: { storyId: story.id, visitorId: visitor.id },
      });
    liked = true;
    likes = await prisma.successStoryLike.count({
      where: { storyId: story.id },
    });
  }
  if (action === "view") {
    const duplicate = await prisma.successStoryView.findUnique({
      where: {
        storyId_visitorId: { storyId: story.id, visitorId: visitor.id },
      },
    });
    if (!duplicate) {
      await prisma.successStoryView.create({
        data: { storyId: story.id, visitorId: visitor.id },
      });
      const updated = await prisma.successStory.update({
        where: { id: story.id },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      views = updated.viewCount;
    } else
      views = await prisma.successStoryView.count({
        where: { storyId: story.id },
      });
  }

  const response = NextResponse.json({ liked, likes, views });
  if (visitor.isNew)
    response.cookies.set("docmath_story_visitor", visitor.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  return response;
}
