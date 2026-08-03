/**
 * theses-algerie.com - agregateur national (Elastic App Search).
 *
 * Pourquoi cette source :
 *  - elle indexe 100+ etablissements algeriens, dont plusieurs dont le depot
 *    DSpace est injoignable depuis le reseau local (Jijel, Bejaia, Tebessa...) ;
 *  - elle expose un champ `field` DEJA classe, donc plus besoin de deviner la
 *    discipline a partir du nom de la collection (c'est ce qui produisait les
 *    centaines de lignes en `review` du chemin HTML) ;
 *  - elle renvoie le resume et le type de diplome, que le chemin /browse perd ;
 *  - elle heberge une copie des PDF sur bucket.theses-algerie.com.
 *
 * Limite dure de l'API : Elastic App Search refuse page.current * page.size
 * au-dela de 10 000. On decoupe donc chaque discipline par type de document,
 * puis par tranche d'annees, jusqu'a passer sous le plafond.
 */
import { ensureIndexes, thesesCol, type ThesisDoc } from "./db";
import {
  buildSearchText,
  classify,
  DEGREE_AR,
  detectBranch,
  detectDegree,
  detectLang,
  norm,
} from "./normalize";
import type { Purity } from "./repos";

const ENGINE = "https://engine.theses-algerie.com/api/as/v1/engines/theses-dz";

// Cle publique de recherche : celle que leur propre front-end envoie depuis le
// navigateur. Ne JAMAIS utiliser la cle "private-" du meme service.
const SEARCH_KEY = process.env.TA_SEARCH_KEY || "search-tcwftsrg9j5xyaqpgtt2oqqk";

const PAGE = 100;
const MAX_RESULTS = 10000;
const MAX_PAGES = Math.floor(MAX_RESULTS / PAGE);
const FIRST_YEAR = 1962;
const GAP_MS = 250;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- disciplines retenues -----------------------------------------------
// `pure` => tout est garde ; `mixed` => classify() exige un mot-cle math.
export const TA_FIELDS: Array<{ name: string; purity: Purity }> = [
  { name: "Math\u00e9matiques", purity: "pure" },
  { name: "Recherche Op\u00e9rationnelle", purity: "pure" },
  { name: "Sciences Exactes Et Sciences De La Nature Et De La Vie", purity: "mixed" },
  { name: "Sciences De La Mati\u00e8re", purity: "mixed" },
  { name: "Informatique", purity: "mixed" },
  { name: "Sciences Et Technologie", purity: "mixed" },
];

// Types de documents tels qu'ils existent dans l'index (facette `type`).
const TA_TYPES = [
  "Th\u00e8se de Doctorat",
  "M\u00e9moire de Magister",
  "M\u00e9moire de Master",
  "M\u00e9moire de Licence",
  "M\u00e9moire d'Ing\u00e9niorat",
  "M\u00e9moire de Fin d'\u00c9tude",
  "Autre",
  "Article",
  "Articles Scientifiques Et Publications",
  "Non identifi\u00e9",
  "Rapport de Stage M\u00e9dical",
  "M\u00e9moire de Docteur en Science M\u00e9dicale",
];

// --- etablissements ------------------------------------------------------
// publisher renvoye par l'API -> [slug, nom arabe, wilaya].
// Les slugs reprennent ceux de repos.ts quand l'universite y figure deja,
// pour que le site continue de filtrer sur une seule valeur.
const PUBLISHERS: Record<string, [string, string, string]> = {
  "Universit\u00e9 Kasdi Merbah - Ouergla": ["ouargla", "\u062c\u0627\u0645\u0639\u0629 \u0642\u0627\u0635\u062f\u064a \u0645\u0631\u0628\u0627\u062d - \u0648\u0631\u0642\u0644\u0629", "\u0648\u0631\u0642\u0644\u0629"],
  "Universit\u00e9 Saad Dahleb - Blida": ["blida-1", "\u062c\u0627\u0645\u0639\u0629 \u0633\u0639\u062f \u062f\u062d\u0644\u0628 - \u0627\u0644\u0628\u0644\u064a\u062f\u0629", "\u0627\u0644\u0628\u0644\u064a\u062f\u0629"],
  "Universit\u00e9 Abderrahmane Mira - Bejaia": ["bejaia", "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0627\u0646 \u0645\u064a\u0631\u0629 - \u0628\u062c\u0627\u064a\u0629", "\u0628\u062c\u0627\u064a\u0629"],
  "Universit\u00e9 Hamma Lakhdar - Eloued": ["eloued", "\u062c\u0627\u0645\u0639\u0629 \u062d\u0645\u0629 \u0644\u062e\u0636\u0631 - \u0627\u0644\u0648\u0627\u062f\u064a", "\u0627\u0644\u0648\u0627\u062f\u064a"],
  "Universit\u00e9 Abou Bekr Belkaid - Tlemcen": ["tlemcen", "\u062c\u0627\u0645\u0639\u0629 \u0623\u0628\u0648 \u0628\u0643\u0631 \u0628\u0644\u0642\u0627\u064a\u062f - \u062a\u0644\u0645\u0633\u0627\u0646", "\u062a\u0644\u0645\u0633\u0627\u0646"],
  "Universit\u00e9 Mouloud Mammeri - Tizi Ouzou": ["tizi-ouzou", "\u062c\u0627\u0645\u0639\u0629 \u0645\u0648\u0644\u0648\u062f \u0645\u0639\u0645\u0631\u064a - \u062a\u064a\u0632\u064a \u0648\u0632\u0648", "\u062a\u064a\u0632\u064a \u0648\u0632\u0648"],
  "Universit\u00e9 Mohamed Boudiaf - M'sila": ["msila", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0628\u0648\u0636\u064a\u0627\u0641 - \u0627\u0644\u0645\u0633\u064a\u0644\u0629", "\u0627\u0644\u0645\u0633\u064a\u0644\u0629"],
  "Universit\u00e9 Mohamed Khider - Biskra": ["biskra", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u062e\u064a\u0636\u0631 - \u0628\u0633\u0643\u0631\u0629", "\u0628\u0633\u0643\u0631\u0629"],
  "Universit\u00e9 Abdelhamid Ibn Badis - Mostaganem": ["mostaganem", "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u062f \u0627\u0644\u062d\u0645\u064a\u062f \u0628\u0646 \u0628\u0627\u062f\u064a\u0633 - \u0645\u0633\u062a\u063a\u0627\u0646\u0645", "\u0645\u0633\u062a\u063a\u0627\u0646\u0645"],
  "Universit\u00e9 Ziane Achour - Djelfa": ["djelfa", "\u062c\u0627\u0645\u0639\u0629 \u0632\u064a\u0627\u0646 \u0639\u0627\u0634\u0648\u0631 - \u0627\u0644\u062c\u0644\u0641\u0629", "\u0627\u0644\u062c\u0644\u0641\u0629"],
  "\u00c9cole Nationale Polytechnique - Alger": ["enp-alger", "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0648\u0637\u0646\u064a\u0629 \u0627\u0644\u0645\u062a\u0639\u062f\u062f\u0629 \u0627\u0644\u062a\u0642\u0646\u064a\u0627\u062a", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 Yahia Fares - M\u00e9d\u00e9a": ["medea", "\u062c\u0627\u0645\u0639\u0629 \u064a\u062d\u064a \u0641\u0627\u0631\u0633 - \u0627\u0644\u0645\u062f\u064a\u0629", "\u0627\u0644\u0645\u062f\u064a\u0629"],
  "Universit\u00e9 Yahia Far\u00e8s - M\u00e9d\u00e9a": ["medea", "\u062c\u0627\u0645\u0639\u0629 \u064a\u062d\u064a \u0641\u0627\u0631\u0633 - \u0627\u0644\u0645\u062f\u064a\u0629", "\u0627\u0644\u0645\u062f\u064a\u0629"],
  "Universit\u00e9 Ibn Khaldoun - Tiaret": ["tiaret", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0628\u0646 \u062e\u0644\u062f\u0648\u0646 - \u062a\u064a\u0627\u0631\u062a", "\u062a\u064a\u0627\u0631\u062a"],
  "Universit\u00e9 Fr\u00e8res Mentouri - Constantine 1": ["constantine-1", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0625\u062e\u0648\u0629 \u0645\u0646\u062a\u0648\u0631\u064a - \u0642\u0633\u0646\u0637\u064a\u0646\u0629 1", "\u0642\u0633\u0646\u0637\u064a\u0646\u0629"],
  "Universit\u00e9 Mohammed Seddik Ben Yahia - Jijel": ["jijel", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0627\u0644\u0635\u062f\u064a\u0642 \u0628\u0646 \u064a\u062d\u064a - \u062c\u064a\u062c\u0644", "\u062c\u064a\u062c\u0644"],
  "Universit\u00e9 8 mai 1945 - Guelma": ["guelma", "\u062c\u0627\u0645\u0639\u0629 8 \u0645\u0627\u064a 1945 - \u0642\u0627\u0644\u0645\u0629", "\u0642\u0627\u0644\u0645\u0629"],
  "Universit\u00e9 Larbi Ben M'hidi - Om-El-Bouaghi": ["oum-el-bouaghi", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0639\u0631\u0628\u064a \u0628\u0646 \u0645\u0647\u064a\u062f\u064a - \u0623\u0645 \u0627\u0644\u0628\u0648\u0627\u0642\u064a", "\u0623\u0645 \u0627\u0644\u0628\u0648\u0627\u0642\u064a"],
  "Universit\u00e9 Amar Telidji - Laghouat": ["laghouat", "\u062c\u0627\u0645\u0639\u0629 \u0639\u0645\u0627\u0631 \u062b\u0644\u064a\u062c\u064a - \u0627\u0644\u0623\u063a\u0648\u0627\u0637", "\u0627\u0644\u0623\u063a\u0648\u0627\u0637"],
  "Universit\u00e9 M'Hamed Bougara - Boumerdes": ["boumerdes", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0628\u0648\u0642\u0631\u0629 - \u0628\u0648\u0645\u0631\u062f\u0627\u0633", "\u0628\u0648\u0645\u0631\u062f\u0627\u0633"],
  "Universit\u00e9 Mohamed Ben Ahmed - Oran 2": ["oran-2", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0628\u0646 \u0623\u062d\u0645\u062f - \u0648\u0647\u0631\u0627\u0646 2", "\u0648\u0647\u0631\u0627\u0646"],
  "Universit\u00e9 Larbi Tebessi - Tebessa": ["tebessa", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0639\u0631\u0628\u064a \u0627\u0644\u062a\u0628\u0633\u064a - \u062a\u0628\u0633\u0629", "\u062a\u0628\u0633\u0629"],
  "Universit\u00e9 Salah Boubnider - Constantine 3": ["constantine-3", "\u062c\u0627\u0645\u0639\u0629 \u0635\u0627\u0644\u062d \u0628\u0648\u0628\u0646\u064a\u062f\u0631 - \u0642\u0633\u0646\u0637\u064a\u0646\u0629 3", "\u0642\u0633\u0646\u0637\u064a\u0646\u0629"],
  "Universit\u00e9 de Constantine 3": ["constantine-3", "\u062c\u0627\u0645\u0639\u0629 \u0642\u0633\u0646\u0637\u064a\u0646\u0629 3", "\u0642\u0633\u0646\u0637\u064a\u0646\u0629"],
  "Universit\u00e9 Ahmed Ben Bella - Oran 1": ["oran-1", "\u062c\u0627\u0645\u0639\u0629 \u0623\u062d\u0645\u062f \u0628\u0646 \u0628\u0644\u0629 - \u0648\u0647\u0631\u0627\u0646 1", "\u0648\u0647\u0631\u0627\u0646"],
  "Universit\u00e9 Abou EL Kacem Sa\u00e2dallah - Alger 2": ["alger-2", "\u062c\u0627\u0645\u0639\u0629 \u0623\u0628\u0648 \u0627\u0644\u0642\u0627\u0633\u0645 \u0633\u0639\u062f \u0627\u0644\u0644\u0647 - \u0627\u0644\u062c\u0632\u0627\u0626\u0631 2", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 Djillali Liab\u00e8s - Sidi Bel Abb\u00e8s": ["sidi-bel-abbes", "\u062c\u0627\u0645\u0639\u0629 \u062c\u064a\u0644\u0627\u0644\u064a \u0644\u064a\u0627\u0628\u0633 - \u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633", "\u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633"],
  "Universit\u00e9 Badji Mokhtar - Annaba": ["annaba", "\u062c\u0627\u0645\u0639\u0629 \u0628\u0627\u062c\u064a \u0645\u062e\u062a\u0627\u0631 - \u0639\u0646\u0627\u0628\u0629", "\u0639\u0646\u0627\u0628\u0629"],
  "Universit\u00e9 des Sciences et de la Technologie Houari-Boum\u00e9di\u00e8n - Alger": ["usthb", "\u062c\u0627\u0645\u0639\u0629 \u0647\u0648\u0627\u0631\u064a \u0628\u0648\u0645\u062f\u064a\u0646 \u0644\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 des Sciences et de la Technologie Houari-Boum\u00e9di\u00e8n (USTHB) - Alger": ["usthb", "\u062c\u0627\u0645\u0639\u0629 \u0647\u0648\u0627\u0631\u064a \u0628\u0648\u0645\u062f\u064a\u0646 \u0644\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 Benyoucef Benkhedda - Alger 1": ["alger-1", "\u062c\u0627\u0645\u0639\u0629 \u0628\u0646 \u064a\u0648\u0633\u0641 \u0628\u0646 \u062e\u062f\u0629 - \u0627\u0644\u062c\u0632\u0627\u0626\u0631 1", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 Mohamed El Bachir El Ibrahimi - Bordj Bou Arr\u00e9ridj": ["bba", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0627\u0644\u0628\u0634\u064a\u0631 \u0627\u0644\u0625\u0628\u0631\u0627\u0647\u064a\u0645\u064a - \u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c", "\u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c"],
  "universit\u00e9 de Bordj Bou Arr\u00e9ridj": ["bba", "\u062c\u0627\u0645\u0639\u0629 \u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c", "\u0628\u0631\u062c \u0628\u0648\u0639\u0631\u064a\u0631\u064a\u062c"],
  "Universit\u00e9 Ferhat Abbas - S\u00e9tif 1": ["setif-1", "\u062c\u0627\u0645\u0639\u0629 \u0641\u0631\u062d\u0627\u062a \u0639\u0628\u0627\u0633 - \u0633\u0637\u064a\u0641 1", "\u0633\u0637\u064a\u0641"],
  "Universit\u00e9 Mohamed Lamine Debaghine - S\u00e9tif 2": ["setif-2", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0644\u0645\u064a\u0646 \u062f\u0628\u0627\u063a\u064a\u0646 - \u0633\u0637\u064a\u0641 2", "\u0633\u0637\u064a\u0641"],
  "Universit\u00e9 Hadj Lakhdar - Batna 1": ["batna-1", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u062d\u0627\u062c \u0644\u062e\u0636\u0631 - \u0628\u0627\u062a\u0646\u0629 1", "\u0628\u0627\u062a\u0646\u0629"],
  "Universit\u00e9 Mustapha Ben Boulaid - Batna 2": ["batna-2", "\u062c\u0627\u0645\u0639\u0629 \u0645\u0635\u0637\u0641\u0649 \u0628\u0646 \u0628\u0648\u0644\u0639\u064a\u062f - \u0628\u0627\u062a\u0646\u0629 2", "\u0628\u0627\u062a\u0646\u0629"],
  "Universit\u00e9 Abbes Laghrour - Khenchela": ["khenchela", "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u0627\u0633 \u0644\u063a\u0631\u0648\u0631 - \u062e\u0646\u0634\u0644\u0629", "\u062e\u0646\u0634\u0644\u0629"],
  "Universit\u00e9 de Ghardaia": ["ghardaia", "\u062c\u0627\u0645\u0639\u0629 \u063a\u0631\u062f\u0627\u064a\u0629", "\u063a\u0631\u062f\u0627\u064a\u0629"],
  "Universit\u00e9 Hassiba Ben Bouali - Chlef": ["chlef", "\u062c\u0627\u0645\u0639\u0629 \u062d\u0633\u064a\u0628\u0629 \u0628\u0646 \u0628\u0648\u0639\u0644\u064a - \u0627\u0644\u0634\u0644\u0641", "\u0627\u0644\u0634\u0644\u0641"],
  "Universit\u00e9 Ahmed Draia - Adrar": ["adrar", "\u062c\u0627\u0645\u0639\u0629 \u0623\u062d\u0645\u062f \u062f\u0631\u0627\u064a\u0629 - \u0623\u062f\u0631\u0627\u0631", "\u0623\u062f\u0631\u0627\u0631"],
  "Universit\u00e9 Brahim Soltane Chaibout - Alger 3": ["alger-3", "\u062c\u0627\u0645\u0639\u0629 \u0625\u0628\u0631\u0627\u0647\u064a\u0645 \u0633\u0644\u0637\u0627\u0646 \u0634\u0627\u064a\u0628\u0648\u0637 - \u0627\u0644\u062c\u0632\u0627\u0626\u0631 3", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 d'Alger 3": ["alger-3", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u062c\u0632\u0627\u0626\u0631 3", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "Universit\u00e9 Belhadj Bouchaib - Ain T\u00e9mouchent": ["ain-temouchent", "\u062c\u0627\u0645\u0639\u0629 \u0628\u0644\u062d\u0627\u062c \u0628\u0648\u0634\u0639\u064a\u0628 - \u0639\u064a\u0646 \u062a\u0645\u0648\u0634\u0646\u062a", "\u0639\u064a\u0646 \u062a\u0645\u0648\u0634\u0646\u062a"],
  "Universit\u00e9 de Tissemsilt": ["tissemsilt", "\u062c\u0627\u0645\u0639\u0629 \u062a\u064a\u0633\u0645\u0633\u064a\u0644\u062a", "\u062a\u064a\u0633\u0645\u0633\u064a\u0644\u062a"],
  "Universit\u00e9 Akli Mohand Oulhadj - Bouira": ["bouira", "\u062c\u0627\u0645\u0639\u0629 \u0623\u0643\u0644\u064a \u0645\u062d\u0646\u062f \u0623\u0648\u0644\u062d\u0627\u062c - \u0627\u0644\u0628\u0648\u064a\u0631\u0629", "\u0627\u0644\u0628\u0648\u064a\u0631\u0629"],
  "Centre Universitaire Abdel Hafid Boussouf - Mila": ["mila", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0639\u0628\u062f \u0627\u0644\u062d\u0641\u064a\u0638 \u0628\u0648\u0627\u0644\u0635\u0648\u0641 - \u0645\u064a\u0644\u0629", "\u0645\u064a\u0644\u0629"],
  "Universit\u00e9 Lounici Ali - Blida 2": ["blida-2", "\u062c\u0627\u0645\u0639\u0629 \u0644\u0648\u0646\u064a\u0633\u064a \u0639\u0644\u064a - \u0627\u0644\u0628\u0644\u064a\u062f\u0629 2", "\u0627\u0644\u0628\u0644\u064a\u062f\u0629"],
  "Universit\u00e9 Mustapha Stambouli - Mascara": ["mascara", "\u062c\u0627\u0645\u0639\u0629 \u0645\u0635\u0637\u0641\u0649 \u0627\u0633\u0637\u0645\u0628\u0648\u0644\u064a - \u0645\u0639\u0633\u0643\u0631", "\u0645\u0639\u0633\u0643\u0631"],
  "Universit\u00e9 Abdelhamid Mehri - Constantine 2": ["constantine-2", "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u062f \u0627\u0644\u062d\u0645\u064a\u062f \u0645\u0647\u0631\u064a - \u0642\u0633\u0646\u0637\u064a\u0646\u0629 2", "\u0642\u0633\u0646\u0637\u064a\u0646\u0629"],
  "Universit\u00e9 de Tamenghasset": ["tamanrasset", "\u062c\u0627\u0645\u0639\u0629 \u062a\u0627\u0645\u0646\u063a\u0633\u062a", "\u062a\u0627\u0645\u0646\u063a\u0633\u062a"],
  "Universit\u00e9 Djilali Bounaama - Khemis Miliana": ["khemis-miliana", "\u062c\u0627\u0645\u0639\u0629 \u062c\u064a\u0644\u0627\u0644\u064a \u0628\u0648\u0646\u0639\u0627\u0645\u0629 - \u062e\u0645\u064a\u0633 \u0645\u0644\u064a\u0627\u0646\u0629", "\u0639\u064a\u0646 \u0627\u0644\u062f\u0641\u0644\u0649"],
  "Universit\u00e9 Mohamed-Ch\u00e9rif Messaadia - Souk Ahras": ["souk-ahras", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0627\u0644\u0634\u0631\u064a\u0641 \u0645\u0633\u0627\u0639\u062f\u064a\u0629 - \u0633\u0648\u0642 \u0623\u0647\u0631\u0627\u0633", "\u0633\u0648\u0642 \u0623\u0647\u0631\u0627\u0633"],
  "Universit\u00e9 de B\u00e9char": ["bechar", "\u062c\u0627\u0645\u0639\u0629 \u0628\u0634\u0627\u0631", "\u0628\u0634\u0627\u0631"],
  "\u00c9cole Normale Sup\u00e9rieure - Bouzar\u00e9ah": ["ens-bouzareah", "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u064a\u0627 \u0644\u0644\u0623\u0633\u0627\u062a\u0630\u0629 - \u0628\u0648\u0632\u0631\u064a\u0639\u0629", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "\u00c9cole Normale Sup\u00e9rieure - Kouba": ["ens-kouba", "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u064a\u0627 \u0644\u0644\u0623\u0633\u0627\u062a\u0630\u0629 - \u0627\u0644\u0642\u0628\u0629", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631"],
  "\u00c9cole sup\u00e9rieure en informatique - Sidi Bel Abb\u00e8s": ["esi-sba", "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0639\u0644\u064a\u0627 \u0644\u0644\u0625\u0639\u0644\u0627\u0645 \u0627\u0644\u0622\u0644\u064a - \u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633", "\u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633"],
  "Universit\u00e9 de Relizane": ["relizane", "\u062c\u0627\u0645\u0639\u0629 \u063a\u0644\u064a\u0632\u0627\u0646", "\u063a\u0644\u064a\u0632\u0627\u0646"],
  "Universit\u00e9 des Sciences et de la Technologie Mohamed-Boudiaf - Oran": ["usto", "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0628\u0648\u0636\u064a\u0627\u0641 \u0644\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627 - \u0648\u0647\u0631\u0627\u0646", "\u0648\u0647\u0631\u0627\u0646"],
  "Universit\u00e9 20 Aout 1955 - Skikda": ["skikda", "\u062c\u0627\u0645\u0639\u0629 20 \u0623\u0648\u062a 1955 - \u0633\u0643\u064a\u0643\u062f\u0629", "\u0633\u0643\u064a\u0643\u062f\u0629"],
  "Universit\u00e9 de Saida, Dr. Moulay Tahar": ["saida", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u062f\u0643\u062a\u0648\u0631 \u0645\u0648\u0644\u0627\u064a \u0627\u0644\u0637\u0627\u0647\u0631 - \u0633\u0639\u064a\u062f\u0629", "\u0633\u0639\u064a\u062f\u0629"],
  "Universit\u00e9 Tahar Moulay de Saida": ["saida", "\u062c\u0627\u0645\u0639\u0629 \u0627\u0644\u0637\u0627\u0647\u0631 \u0645\u0648\u0644\u0627\u064a - \u0633\u0639\u064a\u062f\u0629", "\u0633\u0639\u064a\u062f\u0629"],
  "Centre Universitaire de Maghnia": ["maghnia", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0645\u063a\u0646\u064a\u0629", "\u062a\u0644\u0645\u0633\u0627\u0646"],
  "Centre universitaire de Tindouf": ["tindouf", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u062a\u0646\u062f\u0648\u0641", "\u062a\u0646\u062f\u0648\u0641"],
  "Centre universitaire d'El Bayadh": ["el-bayadh", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0627\u0644\u0628\u064a\u0636", "\u0627\u0644\u0628\u064a\u0636"],
  "Centre universitaire Aflou": ["aflou", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0623\u0641\u0644\u0648", "\u0627\u0644\u0623\u063a\u0648\u0627\u0637"],
  "Centre Universitaire de Barika": ["barika", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0628\u0631\u064a\u0643\u0629", "\u0628\u0627\u062a\u0646\u0629"],
  "Centre Universitaire d'Illizi": ["illizi", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u0625\u064a\u0644\u064a\u0632\u064a", "\u0625\u064a\u0644\u064a\u0632\u064a"],
  "Centre universitaire de Tipaza": ["tipaza", "\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062c\u0627\u0645\u0639\u064a \u062a\u064a\u0628\u0627\u0632\u0629", "\u062a\u064a\u0628\u0627\u0632\u0629"],
};

function slugify(s: string): string {
  const base = norm(s).replace(/\s+/g, "-");
  return base ? "ta-" + base.slice(0, 48) : "ta-inconnu";
}

function institutionOf(publisher: string): { slug: string; ar: string; wilaya: string } {
  const hit = PUBLISHERS[publisher];
  if (hit) return { slug: hit[0], ar: hit[1], wilaya: hit[2] };
  return { slug: slugify(publisher), ar: publisher, wilaya: "" };
}

// --- client HTTP ---------------------------------------------------------

type TaRaw = { raw?: unknown } | undefined;
type TaResult = Record<string, TaRaw>;
type TaResponse = {
  meta?: { page?: { total_results?: number; total_pages?: number } };
  results?: TaResult[];
  errors?: unknown;
};

const RESULT_FIELDS: Record<string, { raw: Record<string, never> }> = {
  id: { raw: {} },
  title: { raw: {} },
  abstract: { raw: {} },
  keywords: { raw: {} },
  authors: { raw: {} },
  publisher: { raw: {} },
  field: { raw: {} },
  type: { raw: {} },
  language: { raw: {} },
  publication_date: { raw: {} },
  identifier_uri: { raw: {} },
  url: { raw: {} },
};

async function post(body: Record<string, unknown>, tries = 3): Promise<TaResponse> {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(ENGINE + "/search.json", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + SEARCH_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = (await res.json()) as TaResponse;
      if (json.errors) throw new Error("API: " + JSON.stringify(json.errors).slice(0, 200));
      return json;
    } catch (e) {
      lastErr = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// --- decoupage sous le plafond des 10 000 -------------------------------

type Slice = { field: string; type?: string; from?: number; to?: number };

function filtersOf(s: Slice): Record<string, unknown> {
  const all: Array<Record<string, unknown>> = [{ field: s.field }];
  if (s.type) all.push({ type: s.type });
  if (s.from !== undefined && s.to !== undefined) {
    all.push({ publication_date: { from: s.from, to: s.to + 1 } });
  }
  return { all };
}

function labelOf(s: Slice): string {
  let l = s.field;
  if (s.type) l += " / " + s.type;
  if (s.from !== undefined) l += " / " + s.from + "-" + s.to;
  return l;
}

async function totalOf(s: Slice): Promise<number> {
  const r = await post({
    query: "",
    filters: filtersOf(s),
    page: { size: 1, current: 1 },
  });
  return r.meta?.page?.total_results ?? 0;
}

// --- conversion ----------------------------------------------------------

function str(v: TaRaw): string {
  const raw = v?.raw;
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  // L'index stocke litteralement "NaN" pour les valeurs manquantes.
  return s === "NaN" || s === "nan" ? "" : s;
}

function list(v: TaRaw): string[] {
  const raw = v?.raw;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter((x) => x && x !== "NaN");
  }
  const s = str(v);
  return s ? [s] : [];
}

function yearFrom(v: TaRaw): number | null {
  const raw = v?.raw;
  const n = typeof raw === "number" ? raw : Number(String(raw ?? ""));
  if (!Number.isFinite(n)) return null;
  const y = Math.trunc(n);
  const max = new Date().getFullYear() + 1;
  return y >= FIRST_YEAR && y <= max ? y : null;
}

function cleanPeople(items: string[]): string[] {
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.replace(/\s+/g, " ").trim();
    if (!v || v.length > 120) continue;
    const n = norm(v);
    if (!n) continue;
    if (!out.some((x) => norm(x) === n)) out.push(v);
  }
  return out.slice(0, 12);
}

function toDoc(hit: TaResult, purity: Purity): ThesisDoc | null {
  const id = str(hit.id);
  const title = str(hit.title);
  if (!id || !title) return null;

  const publisher = str(hit.publisher) || "Non identifi\u00e9";
  const inst = institutionOf(publisher);
  const abstract = str(hit.abstract);
  const keywords = list(hit.keywords).slice(0, 30);
  const authors = cleanPeople(list(hit.authors));
  const type = str(hit.type);
  const discipline = str(hit.field);
  const landing = str(hit.identifier_uri);
  const pdf = str(hit.url);

  const text = norm([title, abstract, keywords.join(" "), type, discipline].join(" "));
  const verdict = classify(text, purity);
  const degree = detectDegree([type, title, discipline]);
  const branch = detectBranch(text);
  const langRaw = str(hit.language);
  const lang =
    langRaw === "ar" || langRaw === "fr" || langRaw === "en"
      ? langRaw
      : detectLang(title + " " + abstract);

  return {
    _id: "ta|" + id,
    repo: "ta",
    uniFr: publisher,
    uniAr: inst.ar,
    uniSlug: inst.slug,
    wilaya: inst.wilaya,
    oaiId: "ta:" + id,
    setSpecs: [discipline || "ta"],
    title,
    abstract: abstract.slice(0, 4000),
    authors,
    supervisors: [],
    keywords,
    year: yearFrom(hit.publication_date),
    degree,
    degreeAr: DEGREE_AR[degree],
    branch: branch.key,
    branchAr: branch.ar,
    lang,
    landingUrl: landing || pdf || "https://www.theses-algerie.com",
    st: buildSearchText(title, abstract, authors, keywords, inst.ar, publisher),
    status: verdict.status,
    reason: verdict.reason,
    datestamp: "",
    updatedAt: new Date(),
    // Copie miroir chez l'agregateur : bien plus rapide que les serveurs .dz.
    ...(pdf ? { pdfUrl: pdf, pdfAt: new Date() } : {}),
  };
}

// --- moisson -------------------------------------------------------------

export type TaSummary = {
  field: string;
  found: number;
  saved: number;
  review: number;
  rejected: number;
  slices: number;
  error?: string;
};

type Sink = (docs: ThesisDoc[]) => Promise<void>;

async function pageThrough(
  s: Slice,
  purity: Purity,
  total: number,
  sink: Sink,
  log: (m: string) => void
): Promise<number> {
  const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE));
  let n = 0;
  for (let p = 1; p <= pages; p++) {
    const r = await post({
      query: "",
      filters: filtersOf(s),
      result_fields: RESULT_FIELDS,
      page: { size: PAGE, current: p },
    });
    const hits = r.results || [];
    if (!hits.length) break;
    const docs: ThesisDoc[] = [];
    for (const h of hits) {
      const d = toDoc(h, purity);
      if (d) docs.push(d);
    }
    if (docs.length) await sink(docs);
    n += docs.length;
    if (hits.length < PAGE) break;
    await sleep(GAP_MS);
  }
  log("    " + labelOf(s) + " -> " + n + "/" + total);
  return n;
}

function yearBuckets(): Array<[number, number]> {
  const max = new Date().getFullYear() + 1;
  const out: Array<[number, number]> = [[FIRST_YEAR, 1999]];
  for (let y = 2000; y <= max; y += 3) out.push([y, Math.min(y + 2, max)]);
  return out;
}

async function harvestSlice(
  s: Slice,
  purity: Purity,
  sink: Sink,
  log: (m: string) => void
): Promise<{ n: number; slices: number }> {
  const total = await totalOf(s);
  if (total === 0) return { n: 0, slices: 1 };

  if (total <= MAX_RESULTS) {
    return { n: await pageThrough(s, purity, total, sink, log), slices: 1 };
  }

  // Au-dela du plafond : on descend d'un cran dans le decoupage.
  if (!s.type) {
    log("    " + labelOf(s) + " = " + total + " > " + MAX_RESULTS + " -> decoupage par type");
    let n = 0;
    let slices = 0;
    for (const t of TA_TYPES) {
      const r = await harvestSlice({ ...s, type: t }, purity, sink, log);
      n += r.n;
      slices += r.slices;
    }
    return { n, slices };
  }

  if (s.from === undefined) {
    log("    " + labelOf(s) + " = " + total + " > " + MAX_RESULTS + " -> decoupage par annees");
    let n = 0;
    let slices = 0;
    for (const [a, b] of yearBuckets()) {
      const r = await harvestSlice({ ...s, from: a, to: b }, purity, sink, log);
      n += r.n;
      slices += r.slices;
    }
    return { n, slices };
  }

  const from = s.from;
  const to = s.to ?? from;
  if (to > from) {
    const mid = Math.floor((from + to) / 2);
    const left = await harvestSlice({ ...s, from, to: mid }, purity, sink, log);
    const right = await harvestSlice({ ...s, from: mid + 1, to }, purity, sink, log);
    return { n: left.n + right.n, slices: left.slices + right.slices };
  }

  // Une seule annee depasse encore le plafond : on prend ce que l'API accepte.
  log("    !! " + labelOf(s) + " = " + total + " indivisible, tronque a " + MAX_RESULTS);
  return { n: await pageThrough(s, purity, MAX_RESULTS, sink, log), slices: 1 };
}

export async function harvestAggregator(
  opts: { fields?: string[] } = {},
  log: (m: string) => void = () => {}
): Promise<TaSummary[]> {
  await ensureIndexes();
  const col = await thesesCol();

  const wanted = opts.fields?.length
    ? TA_FIELDS.filter((f) => opts.fields!.some((w) => norm(w) === norm(f.name)))
    : TA_FIELDS;

  if (!wanted.length) {
    log("!! aucune discipline reconnue - valeurs possibles: " + TA_FIELDS.map((f) => f.name).join(", "));
    return [];
  }

  const out: TaSummary[] = [];
  for (const f of wanted) {
    const sum: TaSummary = {
      field: f.name,
      found: 0,
      saved: 0,
      review: 0,
      rejected: 0,
      slices: 0,
    };
    const sink: Sink = async (docs) => {
      sum.found += docs.length;
      await col.bulkWrite(
        docs.map((d) => ({
          replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
        })),
        { ordered: false }
      );
      for (const d of docs) {
        if (d.status === "ok") sum.saved++;
        else if (d.status === "review") sum.review++;
        else sum.rejected++;
      }
    };

    log("== " + f.name + " [" + f.purity + "]");
    try {
      const r = await harvestSlice({ field: f.name }, f.purity, sink, log);
      sum.slices = r.slices;
    } catch (e) {
      sum.error = e instanceof Error ? e.message : String(e);
      log("   ERREUR " + sum.error);
    }
    log(
      "   found=" + sum.found + " ok=" + sum.saved + " review=" + sum.review +
        " rejected=" + sum.rejected + " (" + sum.slices + " tranches)"
    );
    out.push(sum);
  }
  return out;
}

/**
 * Deduplication inter-sources.
 *
 * La meme these peut arriver deux fois : une fois moissonnee directement sur le
 * DSpace de l'universite, une fois via l'agregateur. On regroupe sur
 * (hote + handle) plutot que sur l'URL brute, car les contextes different
 * (/jspui/handle/... contre /handle/...). On garde la fiche la plus riche.
 */
export async function dedupeByHandle(log: (m: string) => void = () => {}): Promise<number> {
  const col = await thesesCol();
  const cursor = col.find(
    { landingUrl: { $regex: "/handle/" } },
    { projection: { _id: 1, landingUrl: 1, abstract: 1, status: 1, keywords: 1 } }
  );

  const groups = new Map<string, Array<{ id: string; score: number }>>();
  for await (const d of cursor) {
    const url = String(d.landingUrl || "");
    const m = url.match(/^https?:\/\/([^/]+)[\s\S]*\/handle\/(\d+\/\d+)/i);
    if (!m) continue;
    const host = m[1].toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
    const key = host + "|" + m[2];
    const score =
      String(d.abstract || "").length +
      (Array.isArray(d.keywords) ? d.keywords.length * 50 : 0) +
      (d.status === "ok" ? 100000 : 0);
    const arr = groups.get(key);
    if (arr) arr.push({ id: String(d._id), score });
    else groups.set(key, [{ id: String(d._id), score }]);
  }

  const doomed: string[] = [];
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => b.score - a.score);
    for (let i = 1; i < arr.length; i++) doomed.push(arr[i].id);
  }

  if (!doomed.length) {
    log("dedupe -> aucun doublon");
    return 0;
  }
  for (let i = 0; i < doomed.length; i += 500) {
    await col.deleteMany({ _id: { $in: doomed.slice(i, i + 500) } });
  }
  log("dedupe -> " + doomed.length + " doublons supprimes");
  return doomed.length;
}
