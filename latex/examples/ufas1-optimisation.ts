// Exemple 1 : Setif 1 - reproduit un sujet d'Optimisation (reference visuelle).
import type { ExamInput } from "../generate-exam";

export const exam: ExamInput = {
	universityFrench: "Université Ferhat Abbas -- Sétif 1",
	universityArabic: "جامعة فرحات عباس سطيف 1",
	facultyFrench: "Faculté des Sciences",
	facultyArabic: "كلية العلوم",
	year: "2025-2026",
	field: "Mathématiques",
	specialty: "Optimisation et contrôle",
	exam: "Optimisation",
	logo: "logos/universities/ufas1.png",
	exercises: [
		{
			number: 1,
			points: 6,
			statement: String.raw`Soit $\omega$ l'ensemble défini par
\[
\omega = \left\{ (x_1,x_2)\in\mathbb{R}^2 : x_1-1\geq 0,\; 3-x_2\geq 0,\; c_1x_1-c_2x_2\geq 0,\; x_1,x_2\geq 0 \right\}.
\]
avec $c_1,c_2\in\mathbb{R}$. On considère la fonction $f:\omega\longrightarrow\mathbb{R}^+$ définie par
\[
f(x_1,x_2) = 2\ln(x_1)+\ln(3-x_2).
\]
Le but est d'étudier le problème qui optimise $f$ sur $\omega$ en fonction de $c_1$ et $c_2$.`,
			questions: [
				{ content: "Définir le Lagrangien de ce problème." },
				{ content: "Étudier les points critiques du Lagrangien." },
				{ content: "Que peut-on conclure ?" },
			],
		},
		{
			number: 2,
			points: 6,
			statement: String.raw`Soit $A\in S_n^+(\mathbb{R})$ l'ensemble des matrices symétriques semi-définies positives. On considère la fonction $f:\mathbb{R}^n\setminus\{0\}\longrightarrow\mathbb{R}$ définie par
\[
f(x)=\frac{\langle Ax,x\rangle}{\|x\|^2},
\]
où $\langle\cdot,\cdot\rangle$ est le produit scalaire euclidien de $\mathbb{R}^n$ et $\|\cdot\|$ la norme induite.`,
			questions: [
				{
					content: String.raw`Montrer que $f$ est $C^\infty$ sur son domaine de définition.`,
				},
				{
					content: String.raw`Montrer que chacun des deux problèmes d'optimisation $\inf_{x\neq 0} f(x)$ et $\sup_{x\neq 0} f(x)$ possède une solution.`,
				},
				{
					content: String.raw`Déterminer l'ensemble des points critiques de la fonction $f$.`,
				},
				{ content: "Résoudre les deux problèmes ci-dessus." },
			],
		},
	],
};
