// Exemple 2 : une AUTRE universite avec le meme modele (aucune modification du .tex).
// Couvre aussi : sujet multi-pages, enonce long, sous-questions.
import type { ExamInput } from "../generate-exam";

export const exam: ExamInput = {
	universityFrench:
		"Université des Sciences et de la Technologie Houari Boumediene",
	universityArabic: "جامعة العلوم والتكنولوجيا هواري بومدين",
	facultyFrench: "Faculté de Mathématiques",
	facultyArabic: "كلية الرياضيات",
	year: "2026-2027",
	field: "Mathématiques",
	specialty: "Analyse fonctionnelle",
	exam: "Analyse",
	logo: "logos/universities/usthb.png",
	exercises: [
		{
			number: 1,
			points: 7,
			statement: String.raw`Soit $H$ un espace de Hilbert séparable et $T:H\to H$ un opérateur linéaire borné, auto-adjoint et compact. On note $\sigma(T)$ son spectre.`,
			questions: [
				{
					content: String.raw`Montrer que $\sigma(T)\subset\mathbb{R}$ et que $\|T\| = \sup_{\lambda\in\sigma(T)} |\lambda|$.`,
				},
				{
					content: "Énoncer le théorème spectral pour un tel opérateur, puis :",
					subQuestions: [
						String.raw`décrire une base hilbertienne de $\overline{\mathrm{Im}\,T}$ formée de vecteurs propres ;`,
						String.raw`en déduire que $T$ est limite en norme d'opérateurs de rang fini.`,
					],
				},
			],
		},
		{
			number: 2,
			// Bareme volontairement absent : le modele n'affiche alors aucune mention de points.
			statement: String.raw`On considère l'espace $L^2(0,1)$ et l'opérateur intégral
\[
(Ku)(x)=\int_0^1 \min(x,t)\, u(t)\, dt .
\]`,
			questions: [
				{ content: String.raw`Montrer que $K$ est auto-adjoint et compact sur $L^2(0,1)$.` },
				{
					content: String.raw`Déterminer les valeurs propres et les fonctions propres de $K$ en résolvant $-v''=\lambda^{-1} v$ avec $v(0)=v'(1)=0$.`,
				},
				{ content: String.raw`En déduire la valeur de $\|K\|$.` },
			],
		},
	],
};
