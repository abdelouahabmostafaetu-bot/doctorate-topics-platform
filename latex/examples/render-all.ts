/**
 * Rend tous les exemples dans latex/out/.
 *
 *   npx tsx latex/examples/render-all.ts
 *
 * Cas couverts : Setif 1, une autre universite, en-tete arabe + francais,
 * notation mathematique, logo manquant, sujet multi-pages.
 */
import path from "node:path";
import { compileExamPdf, type ExamInput } from "../generate-exam";
import { exam as ufas1 } from "./ufas1-optimisation";
import { exam as usthb } from "./usthb-analyse";

// Logo volontairement introuvable : le PDF doit sortir avec un cadre neutre.
const missingLogo: ExamInput = {
	...ufas1,
	specialty: "Optimisation et contrôle (test logo manquant)",
	logo: "logos/universities/ce-fichier-nexiste-pas.png",
};

const cases: Array<{ name: string; exam: ExamInput }> = [
	{ name: "ufas1-optimisation", exam: ufas1 },
	{ name: "usthb-analyse", exam: usthb },
	{ name: "logo-manquant", exam: missingLogo },
];

async function main(): Promise<void> {
	const outDir = path.join(process.cwd(), "latex", "out");
	let failures = 0;

	for (const item of cases) {
		const target = path.join(outDir, item.name + ".pdf");
		try {
			const pdf = await compileExamPdf(item.exam, target);
			console.log("ok   " + item.name + " -> " + pdf);
		} catch (error) {
			failures += 1;
			console.error(
				"fail " +
					item.name +
				"\n" +
					(error instanceof Error ? error.message : String(error)),
			);
		}
	}

	if (failures > 0) process.exitCode = 1;
}

void main();
