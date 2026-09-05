/**
 * DocMath DZ - Generateur PDF XeLaTeX pour les sujets de Doctorat.
 *
 * IMPORTANT : ce generateur est destine a un usage LOCAL / CI (recueils,
 * livres, tirages imprimes). Il n'est PAS branche sur les routes
 * /api/pdf/* du site : l'execution serverless (Vercel) ne fournit pas
 * TeX Live, donc les telechargements de docmathdz.dev passent par
 * src/lib/pdf/exam-template.ts (HTML + KaTeX + Chromium).
 *
 * Securite : le contenu d'un sujet est traite comme des DONNEES.
 * - Les metadonnees (universite, faculte, filiere...) sont echappees.
 * - Les enonces passent par un filtre qui retire les primitives TeX
 *   dangereuses (\write18, \input, \directlua, ...).
 * - xelatex est lance via execFile (tableau d'arguments, aucun shell).
 *
 * Usage :
 *   npx tsx latex/examples/render-all.ts
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

/** Racine du dossier latex/ : les chemins de logos sont relatifs a ce dossier. */
export const LATEX_ROOT = path.join(process.cwd(), "latex");

const TEMPLATE_PATH = path.join(
	LATEX_ROOT,
	"templates",
	"algerian-doctorat-exam.tex",
);

/** Formats acceptes par graphicx sous XeLaTeX (pas de SVG). */
const ALLOWED_LOGO_EXT = new Set([".png", ".pdf", ".jpg", ".jpeg"]);

export type ExamQuestion = {
	content: string;
	subQuestions?: string[];
};

export type ExamExercise = {
	/** Numero impose ; sinon la position dans le tableau. */
	number?: number;
	/** Bareme : affiche seulement s'il est connu. */
	points?: number;
	statement?: string;
	questions?: ExamQuestion[];
};

export type ExamInput = {
	universityFrench: string;
	universityArabic: string;
	facultyFrench?: string;
	facultyArabic?: string;
	/** "2025-2026" ou "2025--2026". */
	year: string;
	field?: string;
	specialty: string;
	exam: string;
	/** Relatif a latex/ : "logos/universities/ufas1.png". */
	logo?: string;
	exercises: ExamExercise[];
};

const DEFAULT_FACULTY_FR = "Faculté des Mathématiques";
const DEFAULT_FACULTY_AR = "كلية الرياضيات";
const DEFAULT_FIELD_FR = "Mathématiques";

/** Echappement des caracteres speciaux TeX dans du texte brut. */
export function escapeLatex(value: string): string {
	return value
		.replace(/\\/g, "\\textbackslash{}")
		.replace(/([#$%&_{}])/g, "\\$1")
		.replace(/\^/g, "\\^{}")
		.replace(/~/g, "\\~{}");
}

/**
 * Champ mathematique controle : on garde $...$ et \[...\], mais on retire
 * les primitives capables de lire/ecrire des fichiers ou d'appeler le shell.
 */
export function sanitizeMath(value: string): string {
	const forbidden = [
		/\\write18/gi,
		/\\immediate/gi,
		/\\openout/gi,
		/\\openin/gi,
		/\\read\b/gi,
		/\\input\b/gi,
		/\\include\b/gi,
		/\\includeonly\b/gi,
		/\\usepackage\b/gi,
		/\\RequirePackage\b/gi,
		/\\documentclass\b/gi,
		/\\catcode/gi,
		/\\csname/gi,
		/\\directlua/gi,
		/\\latelua/gi,
		/\\ShellEscape/gi,
		/\\special\b/gi,
		/\\output\b/gi,
		/\\loop\b/gi,
		/\\def\b/gi,
		/\\let\b/gi,
		/\\expandafter/gi,
	];
	let out = value;
	for (const pattern of forbidden) out = out.replace(pattern, "");
	return out;
}

/** "2025-2026" -> "2025--2026" (tiret demi-cadratin). */
function normalizeYear(year: string): string {
	return year.trim().replace(/^(\d{4})\s*-\s*(\d{4})$/, "$1--$2");
}

function requireText(value: unknown, field: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error("Champ obligatoire manquant ou vide : " + field);
	}
	return value.trim();
}

/** Validation a l'execution : messages utiles pour un administrateur. */
export function assertValidExam(exam: ExamInput): void {
	requireText(exam.universityFrench, "universityFrench");
	requireText(exam.universityArabic, "universityArabic");
	requireText(exam.year, "year");
	requireText(exam.specialty, "specialty");
	requireText(exam.exam, "exam");

	if (!Array.isArray(exam.exercises) || exam.exercises.length === 0) {
		throw new Error("Un sujet doit contenir au moins un exercice.");
	}

	exam.exercises.forEach((exercise, index) => {
		const label = "exercises[" + index + "]";
		const hasStatement =
			typeof exercise.statement === "string" &&
			exercise.statement.trim().length > 0;
		const hasQuestions =
			Array.isArray(exercise.questions) && exercise.questions.length > 0;
		if (!hasStatement && !hasQuestions) {
			throw new Error(label + " : enonce et questions sont tous les deux vides.");
		}
		if (exercise.points != null && !Number.isFinite(exercise.points)) {
			throw new Error(label + ".points doit etre un nombre.");
		}
		(exercise.questions ?? []).forEach((question, qIndex) => {
			requireText(question.content, label + ".questions[" + qIndex + "].content");
		});
	});
}

/**
 * Verifie le logo. Renvoie un chemin relatif utilisable par graphicx,
 * ou "" si aucun logo exploitable : le modele imprime alors un cadre neutre.
 */
export async function resolveLogo(logo?: string): Promise<string> {
	const raw = (logo ?? "").trim();
	if (!raw) return "";

	const ext = path.extname(raw).toLowerCase();
	if (!ALLOWED_LOGO_EXT.has(ext)) {
		console.warn(
			"[logo] format non supporte par XeLaTeX (" +
				ext +
				") : " +
				raw +
				" - cadre neutre utilise. Convertir en PNG ou PDF.",
		);
		return "";
	}

	const relative = raw.replace(/^[/\\]+/, "");
	const absolute = path.isAbsolute(raw) ? raw : path.join(LATEX_ROOT, relative);
	try {
		await fs.access(absolute);
	} catch {
		console.warn("[logo] fichier introuvable : " + absolute + " - cadre neutre utilise.");
		return "";
	}

	// graphicx attend des separateurs "/" meme sous Windows
	return (path.isAbsolute(raw) ? absolute : relative).split(path.sep).join("/");
}

function exerciseToTex(exercise: ExamExercise, index: number): string {
	const number = exercise.number ?? index + 1;
	const points =
		typeof exercise.points === "number" && exercise.points > 0
			? "[" + exercise.points + "]"
			: "";
	const lines: string[] = ["\\ExerciseTitle" + points + "{" + number + "}", ""];

	if (exercise.statement && exercise.statement.trim()) {
		lines.push(sanitizeMath(exercise.statement.trim()), "");
	}

	const questions = exercise.questions ?? [];
	if (questions.length > 0) {
		lines.push("\\begin{Questions}");
		for (const question of questions) {
			lines.push("    \\item " + sanitizeMath(question.content.trim()));
			const subs = question.subQuestions ?? [];
			if (subs.length > 0) {
				lines.push("    \\begin{SubQuestions}");
				for (const sub of subs) {
					lines.push("        \\item " + sanitizeMath(sub.trim()));
				}
				lines.push("    \\end{SubQuestions}");
			}
		}
		lines.push("\\end{Questions}", "");
	}

	return lines.join("\n");
}

/** Remplit le modele et renvoie la source .tex complete. */
export async function renderExamTex(exam: ExamInput): Promise<string> {
	assertValidExam(exam);

	const template = await fs.readFile(TEMPLATE_PATH, "utf8");
	const logo = await resolveLogo(exam.logo);
	const body = exam.exercises
		.map((exercise, index) => exerciseToTex(exercise, index))
		.join("\n");

	// L'arabe n'est pas echappe : les caracteres arabes ne sont pas actifs en TeX.
	const replacements: Array<[string, string]> = [
		["%%UNIVERSITY_FRENCH%%", escapeLatex(exam.universityFrench.trim())],
		["%%UNIVERSITY_ARABIC%%", exam.universityArabic.trim()],
		[
			"%%FACULTY_FRENCH%%",
			escapeLatex((exam.facultyFrench ?? DEFAULT_FACULTY_FR).trim()),
		],
		["%%FACULTY_ARABIC%%", (exam.facultyArabic ?? DEFAULT_FACULTY_AR).trim()],
		["%%YEAR%%", escapeLatex(normalizeYear(exam.year))],
		["%%FIELD%%", escapeLatex((exam.field ?? DEFAULT_FIELD_FR).trim())],
		["%%SPECIALTY%%", escapeLatex(exam.specialty.trim())],
		["%%EXAM%%", escapeLatex(exam.exam.trim())],
		["%%LOGO%%", logo],
		["%%BODY%%", body],
	];

	let tex = template;
	for (const [token, value] of replacements) {
		tex = tex.split(token).join(value);
	}

	// Un jeton oublie deviendrait un commentaire TeX silencieux : on echoue tot.
	const leftover = tex.match(/%%[A-Z_]+%%/g);
	if (leftover) {
		const unique = Array.from(new Set(leftover)).join(", ");
		throw new Error("Jetons non remplaces dans le modele : " + unique);
	}

	return tex;
}

/** Avertit si les polices attendues sont absentes (fc-list optionnel). */
async function warnAboutFonts(): Promise<void> {
	try {
		const { stdout } = await execFileAsync("fc-list", [":family"], {
			maxBuffer: 16 * 1024 * 1024,
		});
		for (const font of ["Amiri", "TeX Gyre Termes"]) {
			if (!stdout.includes(font)) {
				console.warn(
					"[police] " +
						font +
						" introuvable : XeLaTeX echouera. Installer la police puis relancer.",
				);
			}
		}
	} catch {
		// fc-list absent (Windows par exemple) : verification ignoree
	}
}

async function readLogTail(logPath: string, lines = 40): Promise<string> {
	try {
		const log = await fs.readFile(logPath, "utf8");
		return log.split("\n").slice(-lines).join("\n");
	} catch {
		return "(journal xelatex indisponible)";
	}
}

/**
 * Compile le sujet et renvoie le chemin du PDF.
 * - Deux passes : lastpage a besoin de la seconde pour "Page X sur Y".
 * - cwd = latex/ pour que les chemins de logos relatifs soient resolus.
 * - Si outputFile est fourni, le dossier temporaire est supprime.
 */
export async function compileExamPdf(
	exam: ExamInput,
	outputFile?: string,
): Promise<string> {
	const tex = await renderExamTex(exam);
	await warnAboutFonts();

	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docmathdz-exam-"));
	const texPath = path.join(tempDir, "exam.tex");
	await fs.writeFile(texPath, tex, "utf8");

	let keepTempDir = !outputFile;
	try {
		for (let pass = 1; pass <= 2; pass += 1) {
			await execFileAsync(
				"xelatex",
				[
					"-interaction=nonstopmode",
					"-halt-on-error",
					"-file-line-error",
					"-output-directory",
					tempDir,
					texPath,
				],
				{
					cwd: LATEX_ROOT,
					maxBuffer: 32 * 1024 * 1024,
					timeout: 180_000,
				},
			);
		}

		const pdfPath = path.join(tempDir, "exam.pdf");
		await fs.access(pdfPath);
		if (!outputFile) return pdfPath;

		const destination = path.resolve(outputFile);
		await fs.mkdir(path.dirname(destination), { recursive: true });
		await fs.copyFile(pdfPath, destination);
		return destination;
	} catch (error) {
		keepTempDir = true;
		const reason = error instanceof Error ? error.message : String(error);
		const tail = await readLogTail(path.join(tempDir, "exam.log"));
		throw new Error(
			"Echec de la compilation XeLaTeX.\n" +
				"Cause : " +
				reason +
				"\nDossier de travail conserve : " +
				tempDir +
				"\n--- fin du journal ---\n" +
				tail,
		);
	} finally {
		if (!keepTempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	}
}
