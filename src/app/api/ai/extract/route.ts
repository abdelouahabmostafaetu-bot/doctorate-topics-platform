// نقطة استخراج موضوع من صور أو PDF بالذكاء الاصطناعي (للمديرين فقط)
// الحدود: اختبار واحد في كل مرة — ملف PDF واحد أو صورتان كحد أقصى

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { askLLM, askVision, ocrPdf } from "@/lib/ai/llm";

export const runtime = "nodejs";
export const maxDuration = 300;

const EXTRACT_PROMPT = [
  "Tu lis le sujet d'un concours de doctorat en mathematiques (une seule epreuve).",
  "Reponds UNIQUEMENT par un objet JSON valide (guillemets doubles, pas de virgule finale, aucun texte autour, pas de bloc de code) avec exactement ces champs:",
  '{ "title": "titre court du sujet",',
  '  "year": 2024,',
  '  "examType": "general",',
  '  "examNumber": 1,',
  '  "universityName": "nom de l universite (ou vide)",',
  '  "specialtyName": "nom de la specialite (ou vide)",',
  '  "durationMinutes": 270,',
  '  "coefficient": 1,',
  '  "problems": [ { "problemNumber": 1, "title": "Exercice 1", "difficulty": "medium", "statement": "enonce complet", "solution": null } ] }',
  'Valeurs de examType: "general" (epreuve commune/analyse-algebre) ou "specialty" (epreuve de specialite).',
  'Valeurs de difficulty: "easy", "medium" ou "hard".',
  "Champs inconnus: mets null (ou chaine vide pour les noms).",
  "Regles STRICTES pour statement (et solution si elle figure dans le document):",
  "- Recopie le texte fidelement, sans traduire, sans resumer, sans inventer.",
  "- Formules inline: $`...`$ (format GitLab avec backticks). Formules en bloc: ```math ... ``` sur des lignes separees.",
  "- INTERDIT d'utiliser $$...$$ ou \\[...\\]. Commandes KaTeX uniquement.",
  "- Un exercice par element du tableau problems, dans l'ordre du sujet.",
].join("\n");

function jsonErr(msg: string) {
  return NextResponse.json({ ok: false, error: msg });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return jsonErr("غير مصرح — هذه الخدمة للمديرين فقط");
    }

    const fd = await req.formData();
    const pdf = fd.get("pdf");
    const images = fd
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    const hasPdf = pdf instanceof File && pdf.size > 0;

    if (!hasPdf && images.length === 0) {
      return jsonErr("أرسل ملف PDF واحدًا أو صورة واحدة على الأقل");
    }
    if (hasPdf && images.length > 0) {
      return jsonErr("إما ملف PDF أو صور — ليس الاثنين معًا");
    }
    if (images.length > 2) {
      return jsonErr("صورتان كحد أقصى في كل مرة");
    }

    let raw = "";
    if (hasPdf) {
      const file = pdf as File;
      if (file.size > 3.6 * 1024 * 1024) {
        return jsonErr("حجم PDF كبير — الحد 3.5MB");
      }
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const text = await ocrPdf("data:application/pdf;base64," + b64);
      raw = await askLLM(
        EXTRACT_PROMPT + "\n\nVoici le texte OCR du sujet:\n\n" + text.slice(0, 30000),
        "vision",
      );
    } else {
      const urls: string[] = [];
      for (const img of images) {
        if (img.size > 1.9 * 1024 * 1024) {
          return jsonErr("كل صورة يجب أن تكون أقل من 1.8MB");
        }
        const b64 = Buffer.from(await img.arrayBuffer()).toString("base64");
        urls.push("data:" + (img.type || "image/jpeg") + ";base64," + b64);
      }
      raw = await askVision(EXTRACT_PROMPT, urls);
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return jsonErr("رد النموذج ليس JSON صالحًا — أعد المحاولة أو جرّب صورًا أوضح");
    }
    const draft = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : String(e));
  }
}
