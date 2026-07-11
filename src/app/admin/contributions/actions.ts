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
      tags: [] as string[],
      statement,
      solution: solution || null,
      remark: null,
      hasSolution: Boolean(solution),
    };
  });

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

function readDecision(formData: FormData): string {
  // Prefer explicit decision field; fall back to named submit buttons.
  const direct = String(formData.get("decision") ?? "").trim();
  if (direct) return direct;
  for (const key of [
    "decision_publishLatex",
    "decision_acceptFile",
    "decision_reject",
    "decision_duplicate",
  ]) {
    if (formData.get(key) != null) {
      return key.replace("decision_", "");
    }
  }
  return "";
}

export async function reviewContribution(formData: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    redirect("/signin");
  }
  const handledById = session.user.id ?? null;

  const id = String(formData.get("id") ?? "").trim();
  const decision = readDecision(formData);
  const adminNotes =
    String(formData.get("adminNotes") ?? "")
      .trim()
      .slice(0, 2000) || null;
  const universityId = String(formData.get("universityId") ?? "").trim();
  const specialtyId = String(formData.get("specialtyId") ?? "").trim();
  const requestedPoints = Number(formData.get("customPoints") ?? 0);
  const customPoints = Number.isFinite(requestedPoints)
    ? Math.max(0, Math.min(10000, Math.floor(requestedPoints)))
    : 0;

  if (!id) {
    redirect("/admin/contributions?result=missing-id");
  }
  if (!decision) {
    redirect("/admin/contributions?result=missing-decision");
  }

  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    redirect("/admin/contributions?result=not-found");
  }
  if (contribution.status !== "pending") {
    redirect("/admin/contributions?result=already-handled");
  }

  try {
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

    if (decision === "acceptFile") {
      if (contribution.kind !== "files") {
        redirect("/admin/contributions?result=not-file");
      }
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
          handledById,
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

    if (decision === "publishLatex") {
      if (contribution.kind !== "latex" || !contribution.latexContent?.trim()) {
        redirect("/admin/contributions?result=not-latex");
      }
      if (!universityId || !specialtyId) {
        redirect("/admin/contributions?result=metadata-required");
      }
      const year =
        contribution.year && contribution.year >= 2000
          ? contribution.year
          : new Date().getFullYear();

      const [university, specialty] = await Promise.all([
        prisma.university.findUnique({ where: { id: universityId } }),
        prisma.specialty.findUnique({ where: { id: specialtyId } }),
      ]);
      if (!university || !specialty) {
        redirect("/admin/contributions?result=metadata-required");
      }

      const problems = readLatexProblems(contribution.latexContent);
      if (problems.length === 0) {
        redirect("/admin/contributions?result=empty");
      }

      const baseSlug = makeSlug(
        university.name +
          "-" +
          year +
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
            "مسابقة الدكتوراه " + year + " — " + university.nameAr,
          examType:
            contribution.examType === "specialty" ? "specialty" : "general",
          year,
          universityId: university.id,
          specialtyId: specialty.id,
          source: "مساهمة مستخدم تمت مراجعتها ونشرها بواسطة الإدارة.",
          problems,
          files: [],
          status: "published",
          createdById: handledById,
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
          handledById,
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

    redirect("/admin/contributions?result=unknown-decision");
  } catch (error) {
    // Next.js redirect() throws a special error — rethrow it so navigation works.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest || "").startsWith(
        "NEXT_REDIRECT",
      )
    ) {
      throw error;
    }
    console.error("reviewContribution failed", error);
    redirect("/admin/contributions?result=server-error");
  }
}
