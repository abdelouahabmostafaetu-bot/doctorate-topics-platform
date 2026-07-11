"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

type ParsedProblem = {
  problemNumber: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  statement: string;
  solution: string | null;
  remark: string | null;
  hasSolution: boolean;
};

function makeSlug(value: string) {
  const readable = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return readable || "contribution";
}

function readLatexProblems(content: string): ParsedProblem[] {
  const blocks = content
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const problems = blocks.map((block, index) => {
    const heading = block.match(
      /^##\s*(?:Exercice|Exercise|تمرين)\s*(\d+)?\s*\n?/im,
    );
    const number = Number(heading?.[1]) || index + 1;
    const withoutHeading = heading
      ? block.slice(heading[0].length).trim()
      : block;
    const solutionMarker = /\n\s*###\s*(?:Solution|الحل)\s*\n/i;
    const parts = withoutHeading.split(solutionMarker);
    const statement = (parts[0] ?? "").trim();
    const solution = parts.length > 1 ? parts.slice(1).join("\n").trim() : "";
    return {
      problemNumber: number,
      title: "تمرين " + number,
      difficulty: "medium" as const,
      tags: [],
      statement,
      solution: solution || null,
      remark: null,
      hasSolution: Boolean(solution),
    };
  });

  // Contributions written without exercise headings still become one valid problem.
  if (problems.length === 0 && content.trim()) {
    return [
      {
        problemNumber: 1,
        title: "تمرين 1",
        difficulty: "medium",
        tags: [],
        statement: content.trim(),
        solution: null,
        remark: null,
        hasSolution: false,
      },
    ];
  }
  return problems.filter((p) => p.statement || p.solution);
}

function refreshAll() {
  revalidatePath("/admin/contributions");
  revalidatePath("/admin/topics");
  revalidatePath("/contributors");
  revalidatePath("/contribute");
  revalidatePath("/");
  revalidatePath("/topics");
}

export async function reviewContribution(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") redirect("/signin");

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const adminNotes =
    String(formData.get("adminNotes") ?? "")
      .trim()
      .slice(0, 2000) || null;
  const universityId = String(formData.get("universityId") ?? "");
  const specialtyId = String(formData.get("specialtyId") ?? "");
  const requestedPoints = Number(formData.get("customPoints") ?? 0);
  const customPoints = Number.isFinite(requestedPoints)
    ? Math.max(0, Math.min(10000, Math.floor(requestedPoints)))
    : 0;

  if (!id) redirect("/admin/contributions");

  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution || contribution.status !== "pending")
    redirect("/admin/contributions");

  // Rejected or duplicate contributions are fully removed from MongoDB.
  // For rejected uploads, the associated R2 files are removed as well.
  if (decision === "reject" || decision === "duplicate") {
    if (decision === "reject") {
      await Promise.all(
        contribution.files.map((file) =>
          deleteFile(file.url).catch(() => undefined),
        ),
      );
    }
    await prisma.contribution.delete({ where: { id: contribution.id } });
    refreshAll();
    redirect("/admin/contributions?result=removed");
  }

  // Uploaded files are reviewed manually. Admin chooses the exact point amount.
  if (decision === "acceptFile") {
    if (contribution.kind !== "files")
      redirect("/admin/contributions?result=invalid");
    const contributor = await prisma.user.findUnique({
      where: { id: contribution.userId },
      select: { points: true },
    });
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: {
        status: "accepted",
        pointsAwarded: customPoints,
        adminNotes,
        handledById: session.user?.id ?? null,
      },
    });
    if (customPoints > 0) {
      await prisma.user.update({
        where: { id: contribution.userId },
        data: { points: (contributor?.points ?? 0) + customPoints },
      });
    }
    refreshAll();
    redirect("/admin/contributions?result=file-accepted");
  }

  // A LaTeX contribution becomes a published Topic that appears on the website.
  if (decision === "publishLatex") {
    if (contribution.kind !== "latex" || !contribution.latexContent) {
      redirect("/admin/contributions?result=invalid");
    }
    if (!universityId || !specialtyId || !contribution.year) {
      redirect("/admin/contributions?result=metadata-required");
    }

    const [university, specialty] = await Promise.all([
      prisma.university.findUnique({ where: { id: universityId } }),
      prisma.specialty.findUnique({ where: { id: specialtyId } }),
    ]);
    if (!university || !specialty)
      redirect("/admin/contributions?result=metadata-required");

    const problems = readLatexProblems(contribution.latexContent);
    if (problems.length === 0) redirect("/admin/contributions?result=empty");

    const baseSlug = makeSlug(
      university.name +
        "-" +
        contribution.year +
        "-" +
        (contribution.examType || "general"),
    );
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.topic.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = baseSlug + "-" + suffix;
    }

    const topic = await prisma.topic.create({
      data: {
        slug,
        title:
          contribution.title ||
          "مسابقة الدكتوراه " + contribution.year + " — " + university.nameAr,
        examType:
          contribution.examType === "specialty" ? "specialty" : "general",
        year: contribution.year,
        universityId: university.id,
        specialtyId: specialty.id,
        source: "مساهمة مستخدم تمت مراجعتها ونشرها بواسطة الإدارة.",
        problems,
        files: [],
        status: "published",
        createdById: session.user?.id ?? null,
      },
    });

    const contributor = await prisma.user.findUnique({
      where: { id: contribution.userId },
      select: { points: true },
    });
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: {
        status: "accepted",
        pointsAwarded: 10,
        adminNotes,
        handledById: session.user?.id ?? null,
      },
    });
    await prisma.user.update({
      where: { id: contribution.userId },
      data: { points: (contributor?.points ?? 0) + 10 },
    });

    refreshAll();
    revalidatePath("/topics/" + topic.slug);
    redirect("/admin/contributions?result=published");
  }

  redirect("/admin/contributions?result=invalid");
}
