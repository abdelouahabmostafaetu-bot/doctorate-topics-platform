import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  renderSocialImage,
  type SocialImageInput,
} from "@/lib/social/render-social-image";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = (await request.json()) as SocialImageInput;
    if (input.kind !== "quote" && input.kind !== "problem") {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }
    if (!input.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (input.kind === "quote" && !input.quote?.text?.trim()) {
      return NextResponse.json({ error: "Quote text is required" }, { status: 400 });
    }
    if (input.kind === "problem" && !input.problem?.statement?.trim()) {
      return NextResponse.json({ error: "Problem statement is required" }, { status: 400 });
    }

    const image = await renderSocialImage(input);
    return new Response(image, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="docmath-${input.kind}-${input.date}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("social-image generation failed", error);
    return NextResponse.json(
      { error: "تعذّر إنشاء الصورة. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
