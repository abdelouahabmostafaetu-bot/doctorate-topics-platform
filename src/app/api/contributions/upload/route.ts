import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرسال أي ملف." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف يتجاوز 4 م.ب — اضغطه أو قسّمه من فضلك." },
      { status: 400 }
    );
  }

  // كل أنواع الملفات مقبولة
  const name = file.name || "file";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";

  const base = dot >= 0 ? name.slice(0, dot) : name;
  const safeBase = base.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 60) || "file";
  const key =
    "contributions/" + userId + "/" + Date.now() + "-" + safeBase + ext;

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadFile(buffer, key, file.type || "application/octet-stream");

  return NextResponse.json({ url, fileName: name, sizeBytes: file.size });
}
