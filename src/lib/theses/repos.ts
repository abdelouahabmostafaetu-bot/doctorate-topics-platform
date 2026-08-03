// Registry of Algerian university DSpace repositories (math only).
// Verified live on 2026-08-03 via OAI-PMH Identify + ListSets + ListIdentifiers.

export type Degree =
  | "doctorat"
  | "magister"
  | "master"
  | "licence"
  | "ingenieur"
  | "autre";

export type Purity = "pure" | "mixed";

export type SetDef = {
  spec: string;
  label: string;
  purity: Purity;
  degree?: Degree;
};

export type RepoDef = {
  key: string;
  nameFr: string;
  nameAr: string;
  slug: string;
  wilaya: string;
  oai: string;
  version: 6 | 7;
  site: string;
  enabled: boolean;
  note?: string;
  sets: SetDef[];
};

export const REPOS: RepoDef[] = [
  {
    key: "usthb",
    nameFr: "USTHB",
    nameAr: "جامعة هواري بومدين للعلوم والتكنولوجيا",
    slug: "usthb",
    wilaya: "الجزائر",
    oai: "https://dspace.usthb.dz/server/oai/request",
    version: 7,
    site: "https://dspace.usthb.dz",
    enabled: true,
    sets: [{ spec: "com_123456789_15", label: "Mathématiques", purity: "pure" }],
  },
  {
    key: "msila",
    nameFr: "Université Mohamed Boudiaf - M'Sila",
    nameAr: "جامعة محمد بوضياف - المسيلة",
    slug: "msila",
    wilaya: "المسيلة",
    oai: "https://depot.univ-msila.dz/server/oai/request",
    version: 7,
    site: "https://depot.univ-msila.dz",
    enabled: true,
    sets: [
      { spec: "com_123456789_255", label: "Department of Mathematics", purity: "pure" },
      { spec: "com_123456789_15", label: "Faculty of Mathematics and Computer Science", purity: "mixed" },
    ],
  },
  {
    key: "ummto",
    nameFr: "Université Mouloud Mammeri - Tizi Ouzou",
    nameAr: "جامعة مولود معمري - تيزي وزو",
    slug: "tizi-ouzou",
    wilaya: "تيزي وزو",
    oai: "https://dspace.ummto.dz/server/oai/request",
    version: 7,
    site: "https://dspace.ummto.dz",
    enabled: true,
    sets: [
      { spec: "col_ummto_1909", label: "Département de Mathématiques", purity: "pure" },
      { spec: "col_ummto_115", label: "Département de Mathématiques", purity: "pure" },
      { spec: "col_ummto_107", label: "Département de Mathématiques", purity: "pure" },
      { spec: "col_ummto_22181", label: "Département de Mathématiques", purity: "pure" },
      { spec: "col_ummto_22516", label: "Mathématiques et Informatique", purity: "mixed" },
    ],
  },
  {
    key: "tlemcen",
    nameFr: "Université Abou Bekr Belkaid - Tlemcen",
    nameAr: "جامعة أبو بكر بلقايد - تلمسان",
    slug: "tlemcen",
    wilaya: "تلمسان",
    oai: "https://dspace.univ-tlemcen.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-tlemcen.dz",
    enabled: true,
    sets: [
      { spec: "col_112_57", label: "Doctorat Classique en Mathématique", purity: "pure", degree: "doctorat" },
      { spec: "col_112_58", label: "Doctorat LMD en Mathématique", purity: "pure", degree: "doctorat" },
      { spec: "col_112_54", label: "Magister en Mathématique", purity: "pure", degree: "magister" },
      { spec: "col_112_39", label: "Master en Mathématique", purity: "pure", degree: "master" },
      { spec: "col_112_5383", label: "Licence en Mathématique", purity: "pure", degree: "licence" },
    ],
  },
  {
    key: "annaba",
    nameFr: "Université Badji Mokhtar - Annaba",
    nameAr: "جامعة باجي مختار - عنابة",
    slug: "annaba",
    wilaya: "عنابة",
    oai: "https://dspace.univ-annaba.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-annaba.dz",
    enabled: true,
    sets: [
      { spec: "com_123456789_553", label: "Département de Mathématiques", purity: "pure" },
      { spec: "com_123456789_554", label: "Mathématiques et Informatique", purity: "mixed" },
    ],
  },
  {
    key: "ouargla",
    nameFr: "Université Kasdi Merbah - Ouargla",
    nameAr: "جامعة قاصدي مرباح - ورقلة",
    slug: "ouargla",
    wilaya: "ورقلة",
    oai: "https://dspace.univ-ouargla.dz/oai/request",
    version: 6,
    site: "https://dspace.univ-ouargla.dz",
    enabled: true,
    note: "DSpace 6 - connexion parfois instable",
    sets: [
      { spec: "col_123456789_203", label: "Mathématiques - Doctorat", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_314", label: "Mathématiques - Magister", purity: "pure", degree: "magister" },
      { spec: "col_123456789_239", label: "Mathématiques - Master", purity: "pure", degree: "master" },
      { spec: "col_123456789_8519", label: "Mathématiques Mastériales", purity: "pure", degree: "master" },
      { spec: "col_123456789_276", label: "Mathématiques - Licence", purity: "pure", degree: "licence" },
    ],
  },
  {
    key: "temouchent",
    nameFr: "Université Belhadj Bouchaib - Ain Temouchent",
    nameAr: "جامعة بلحاج بوشعيب - عين تموشنت",
    slug: "ain-temouchent",
    wilaya: "عين تموشنت",
    oai: "https://dspace.univ-temouchent.edu.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-temouchent.edu.dz",
    enabled: true,
    sets: [
      { spec: "col_123456789_747", label: "Mathématique", purity: "pure" },
      { spec: "col_123456789_276", label: "Mathématique et Informatique", purity: "mixed" },
      { spec: "col_123456789_421", label: "Mathématique et Informatique", purity: "mixed" },
      { spec: "col_123456789_302", label: "Mathématique et Informatique", purity: "mixed" },
      { spec: "col_123456789_697", label: "Mathématique et Informatique", purity: "mixed" },
      { spec: "col_123456789_723", label: "Mathématique et Informatique", purity: "mixed" },
    ],
  },

  // --- OAI index empty (admins never ran "dspace oai import"). Kept for later. ---
  {
    key: "sba",
    nameFr: "Université Djillali Liabes - Sidi Bel Abbès",
    nameAr: "جامعة جيلالي ليابس - سيدي بلعباس",
    slug: "sidi-bel-abbes",
    wilaya: "سيدي بلعباس",
    oai: "https://dspace.univ-sba.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-sba.dz",
    enabled: false,
    note: "فهرس OAI فارغ - يحتاج تشغيل dspace oai import من طرف الجامعة",
    sets: [
      { spec: "col_123456789_141", label: "[FSE-MATH] Doctorat 3e cycle (LMD)", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_142", label: "[FSE-MATH] Doctorat en Sciences", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_143", label: "[FSE-MATH] Master II", purity: "pure", degree: "master" },
      { spec: "col_123456789_455", label: "[VRPG-Doc] Mathématiques", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_456", label: "[VRPG-Doc] Mathématiques appliquées", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_494", label: "[VRPG-Doc-Sc] Mathématiques", purity: "pure", degree: "doctorat" },
    ],
  },
  {
    key: "chlef",
    nameFr: "Université Hassiba Benbouali - Chlef",
    nameAr: "جامعة حسيبة بن بوعلي - الشلف",
    slug: "chlef",
    wilaya: "الشلف",
    oai: "https://dspace.univ-chlef.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-chlef.dz",
    enabled: false,
    note: "فهرس OAI فارغ",
    sets: [
      { spec: "col_123456789_347", label: "Doctorat en Mathématique & Informatique", purity: "mixed", degree: "doctorat" },
      { spec: "col_123456789_482", label: "Magister en Mathématique & Informatique", purity: "mixed", degree: "magister" },
      { spec: "col_123456789_1024", label: "Master II en Mathématique", purity: "pure", degree: "master" },
    ],
  },
  {
    key: "setif1",
    nameFr: "Université Ferhat Abbas - Sétif 1",
    nameAr: "جامعة فرحات عباس - سطيف 1",
    slug: "setif-1",
    wilaya: "سطيف",
    oai: "http://dspace.univ-setif.dz:8888/oai/request",
    version: 6,
    site: "http://dspace.univ-setif.dz:8888",
    enabled: false,
    note: "فهرس OAI فارغ + ترميز مكسور في الواجهة",
    sets: [
      { spec: "com_123456789_14", label: "Département de Mathématiques", purity: "pure" },
      { spec: "com_123456789_2969", label: "Mathématiques", purity: "pure" },
    ],
  },
];

export function repoByKey(key: string): RepoDef | undefined {
  return REPOS.find((r) => r.key === key);
}

export function enabledRepos(): RepoDef[] {
  return REPOS.filter((r) => r.enabled);
}
