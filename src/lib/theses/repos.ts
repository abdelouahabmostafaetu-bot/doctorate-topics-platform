// Registry of Algerian university DSpace repositories (math only).
// Verified live on 2026-08-03 via OAI-PMH Identify + ListSets + ListIdentifiers.
// mode "rest" = the OAI index is empty, so we harvest through the DSpace 7 REST API.

export type Degree =
  | "doctorat"
  | "magister"
  | "master"
  | "licence"
  | "ingenieur"
  | "autre";

export type Purity = "pure" | "mixed";

export type HarvestMode = "oai" | "rest";

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
  /** Defaults to "oai". */
  mode?: HarvestMode;
  /** REST API base. Defaults to `${site}/server/api` for DSpace 7. */
  rest?: string;
  note?: string;
  sets: SetDef[];
};

export const REPOS: RepoDef[] = [
  {
    key: "usthb",
    nameFr: "USTHB",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0647\u0648\u0627\u0631\u064a \u0628\u0648\u0645\u062f\u064a\u0646 \u0644\u0644\u0639\u0644\u0648\u0645 \u0648\u0627\u0644\u062a\u0643\u0646\u0648\u0644\u0648\u062c\u064a\u0627",
    slug: "usthb",
    wilaya: "\u0627\u0644\u062c\u0632\u0627\u0626\u0631",
    oai: "https://dspace.usthb.dz/server/oai/request",
    version: 7,
    site: "https://dspace.usthb.dz",
    enabled: true,
    sets: [{ spec: "com_123456789_15", label: "Math\u00e9matiques", purity: "pure" }],
  },
  {
    key: "msila",
    nameFr: "Universit\u00e9 Mohamed Boudiaf - M'Sila",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u0628\u0648\u0636\u064a\u0627\u0641 - \u0627\u0644\u0645\u0633\u064a\u0644\u0629",
    slug: "msila",
    wilaya: "\u0627\u0644\u0645\u0633\u064a\u0644\u0629",
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
    nameFr: "Universit\u00e9 Mouloud Mammeri - Tizi Ouzou",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u0648\u0644\u0648\u062f \u0645\u0639\u0645\u0631\u064a - \u062a\u064a\u0632\u064a \u0648\u0632\u0648",
    slug: "tizi-ouzou",
    wilaya: "\u062a\u064a\u0632\u064a \u0648\u0632\u0648",
    oai: "https://dspace.ummto.dz/server/oai/request",
    version: 7,
    site: "https://dspace.ummto.dz",
    enabled: true,
    sets: [
      { spec: "col_ummto_1909", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "col_ummto_115", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "col_ummto_107", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "col_ummto_22181", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "col_ummto_22516", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
    ],
  },
  {
    key: "tlemcen",
    nameFr: "Universit\u00e9 Abou Bekr Belkaid - Tlemcen",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0623\u0628\u0648 \u0628\u0643\u0631 \u0628\u0644\u0642\u0627\u064a\u062f - \u062a\u0644\u0645\u0633\u0627\u0646",
    slug: "tlemcen",
    wilaya: "\u062a\u0644\u0645\u0633\u0627\u0646",
    oai: "https://dspace.univ-tlemcen.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-tlemcen.dz",
    enabled: true,
    sets: [
      { spec: "col_112_57", label: "Doctorat Classique en Math\u00e9matique", purity: "pure", degree: "doctorat" },
      { spec: "col_112_58", label: "Doctorat LMD en Math\u00e9matique", purity: "pure", degree: "doctorat" },
      { spec: "col_112_54", label: "Magister en Math\u00e9matique", purity: "pure", degree: "magister" },
      { spec: "col_112_39", label: "Master en Math\u00e9matique", purity: "pure", degree: "master" },
      { spec: "col_112_5383", label: "Licence en Math\u00e9matique", purity: "pure", degree: "licence" },
    ],
  },
  {
    key: "annaba",
    nameFr: "Universit\u00e9 Badji Mokhtar - Annaba",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0628\u0627\u062c\u064a \u0645\u062e\u062a\u0627\u0631 - \u0639\u0646\u0627\u0628\u0629",
    slug: "annaba",
    wilaya: "\u0639\u0646\u0627\u0628\u0629",
    oai: "https://dspace.univ-annaba.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-annaba.dz",
    enabled: true,
    sets: [
      { spec: "com_123456789_553", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "com_123456789_554", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
    ],
  },
  {
    key: "ouargla",
    nameFr: "Universit\u00e9 Kasdi Merbah - Ouargla",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0642\u0627\u0635\u062f\u064a \u0645\u0631\u0628\u0627\u062d - \u0648\u0631\u0642\u0644\u0629",
    slug: "ouargla",
    wilaya: "\u0648\u0631\u0642\u0644\u0629",
    oai: "https://dspace.univ-ouargla.dz/oai/request",
    version: 6,
    site: "https://dspace.univ-ouargla.dz",
    enabled: true,
    note: "DSpace 6 - connexion parfois instable",
    sets: [
      { spec: "col_123456789_203", label: "Math\u00e9matiques - Doctorat", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_314", label: "Math\u00e9matiques - Magister", purity: "pure", degree: "magister" },
      { spec: "col_123456789_239", label: "Math\u00e9matiques - Master", purity: "pure", degree: "master" },
      { spec: "col_123456789_8519", label: "Math\u00e9matiques Mast\u00e9riales", purity: "pure", degree: "master" },
      { spec: "col_123456789_276", label: "Math\u00e9matiques - Licence", purity: "pure", degree: "licence" },
    ],
  },
  {
    key: "temouchent",
    nameFr: "Universit\u00e9 Belhadj Bouchaib - Ain Temouchent",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0628\u0644\u062d\u0627\u062c \u0628\u0648\u0634\u0639\u064a\u0628 - \u0639\u064a\u0646 \u062a\u0645\u0648\u0634\u0646\u062a",
    slug: "ain-temouchent",
    wilaya: "\u0639\u064a\u0646 \u062a\u0645\u0648\u0634\u0646\u062a",
    oai: "https://dspace.univ-temouchent.edu.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-temouchent.edu.dz",
    enabled: true,
    sets: [
      { spec: "col_123456789_747", label: "Math\u00e9matique", purity: "pure" },
      { spec: "col_123456789_276", label: "Math\u00e9matique et Informatique", purity: "mixed" },
      { spec: "col_123456789_421", label: "Math\u00e9matique et Informatique", purity: "mixed" },
      { spec: "col_123456789_302", label: "Math\u00e9matique et Informatique", purity: "mixed" },
      { spec: "col_123456789_697", label: "Math\u00e9matique et Informatique", purity: "mixed" },
      { spec: "col_123456789_723", label: "Math\u00e9matique et Informatique", purity: "mixed" },
    ],
  },

  // --- Added 2026-08-03 (probe-sets.ps1). ---
  {
    key: "medea",
    nameFr: "Universit\u00e9 Yahia Fares - M\u00e9d\u00e9a",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u064a\u062d\u064a\u0649 \u0641\u0627\u0631\u0633 - \u0627\u0644\u0645\u062f\u064a\u0629",
    slug: "medea",
    wilaya: "\u0627\u0644\u0645\u062f\u064a\u0629",
    oai: "https://dspace.univ-medea.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-medea.dz",
    enabled: true,
    note: "13663 notices au total",
    sets: [
      { spec: "col_123456789_8855", label: "Doctorat en Math\u00e9matique", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_2819", label: "Analyse et Mod\u00e9lisation Math\u00e9matique", purity: "pure" },
      { spec: "col_123456789_2833", label: "Analyse Math\u00e9matiques et Applications", purity: "pure" },
      { spec: "col_123456789_1843", label: "Math\u00e9matiques Appliqu\u00e9es", purity: "pure" },
      { spec: "com_123456789_476", label: "D\u00e9partement Math\u00e9matique et Informatique", purity: "mixed" },
      { spec: "com_123456789_8854", label: "Math\u00e9matique & Informatique", purity: "mixed" },
    ],
  },
  {
    key: "mosta",
    nameFr: "Universit\u00e9 Abdelhamid Ibn Badis - Mostaganem",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0639\u0628\u062f \u0627\u0644\u062d\u0645\u064a\u062f \u0628\u0646 \u0628\u0627\u062f\u064a\u0633 - \u0645\u0633\u062a\u063a\u0627\u0646\u0645",
    slug: "mostaganem",
    wilaya: "\u0645\u0633\u062a\u063a\u0627\u0646\u0645",
    oai: "https://e-biblio.univ-mosta.dz/server/oai/request",
    version: 7,
    site: "https://e-biblio.univ-mosta.dz",
    enabled: true,
    mode: "rest",
    note: "\u0641\u0647\u0631\u0633 OAI \u0641\u0627\u0631\u063a - \u064a\u064f\u062d\u0635\u062f \u0639\u0628\u0631 REST",
    sets: [
      { spec: "col_123456789_18748", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_597", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_588", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_513", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_479", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_437", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_395", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "col_123456789_382", label: "Math\u00e9matiques et Informatique", purity: "mixed" },
      { spec: "com_123456789_1745", label: "D\u00e9partement des Math\u00e9matiques et Informatique", purity: "mixed" },
    ],
  },
  {
    key: "skikda",
    nameFr: "Universit\u00e9 20 Ao\u00fbt 1955 - Skikda",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 20 \u0623\u0648\u062a 1955 - \u0633\u0643\u064a\u0643\u062f\u0629",
    slug: "skikda",
    wilaya: "\u0633\u0643\u064a\u0643\u062f\u0629",
    oai: "http://dspace.univ-skikda.dz:8080/server/oai/request",
    version: 7,
    site: "http://dspace.univ-skikda.dz:8080",
    enabled: true,
    note: "4049 notices au total - serveur sur le port 8080",
    sets: [
      { spec: "col_123456789_260", label: "Math\u00e9matiques", purity: "pure" },
      { spec: "col_123456789_188", label: "Math\u00e9matiques", purity: "pure" },
      { spec: "col_123456789_141", label: "Math\u00e9matiques", purity: "pure" },
      { spec: "col_123456789_140", label: "Math\u00e9matiques", purity: "pure" },
      { spec: "col_123456789_99", label: "Math\u00e9matiques", purity: "pure" },
    ],
  },
  {
    key: "biskra",
    nameFr: "Universit\u00e9 Mohamed Khider - Biskra",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0645\u062d\u0645\u062f \u062e\u064a\u0636\u0631 - \u0628\u0633\u0643\u0631\u0629",
    slug: "biskra",
    wilaya: "\u0628\u0633\u0643\u0631\u0629",
    oai: "http://archives.univ-biskra.dz/oai/request",
    version: 6,
    site: "http://archives.univ-biskra.dz",
    enabled: true,
    note: "DSpace 6 - ListIdentifiers global renvoie 500, moisson par set uniquement",
    sets: [
      { spec: "col_123456789_1091", label: "Math\u00e9matiques", purity: "pure" },
      { spec: "col_123456789_1111", label: "Math\u00e9matiques - Magister", purity: "pure", degree: "magister" },
    ],
  },

  // --- OAI index empty (admins never ran "dspace oai import") -> harvested via REST. ---
  {
    key: "sba",
    nameFr: "Universit\u00e9 Djillali Liabes - Sidi Bel Abb\u00e8s",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u062c\u064a\u0644\u0627\u0644\u064a \u0644\u064a\u0627\u0628\u0633 - \u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633",
    slug: "sidi-bel-abbes",
    wilaya: "\u0633\u064a\u062f\u064a \u0628\u0644\u0639\u0628\u0627\u0633",
    oai: "https://dspace.univ-sba.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-sba.dz",
    enabled: true,
    mode: "rest",
    note: "\u0641\u0647\u0631\u0633 OAI \u0641\u0627\u0631\u063a - \u064a\u064f\u062d\u0635\u062f \u0639\u0628\u0631 REST",
    sets: [
      { spec: "col_123456789_141", label: "[FSE-MATH] Doctorat 3e cycle (LMD)", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_142", label: "[FSE-MATH] Doctorat en Sciences", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_143", label: "[FSE-MATH] Master II", purity: "pure", degree: "master" },
      { spec: "col_123456789_455", label: "[VRPG-Doc] Math\u00e9matiques", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_456", label: "[VRPG-Doc] Math\u00e9matiques appliqu\u00e9es", purity: "pure", degree: "doctorat" },
      { spec: "col_123456789_494", label: "[VRPG-Doc-Sc] Math\u00e9matiques", purity: "pure", degree: "doctorat" },
    ],
  },
  {
    key: "chlef",
    nameFr: "Universit\u00e9 Hassiba Benbouali - Chlef",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u062d\u0633\u064a\u0628\u0629 \u0628\u0646 \u0628\u0648\u0639\u0644\u064a - \u0627\u0644\u0634\u0644\u0641",
    slug: "chlef",
    wilaya: "\u0627\u0644\u0634\u0644\u0641",
    oai: "https://dspace.univ-chlef.dz/server/oai/request",
    version: 7,
    site: "https://dspace.univ-chlef.dz",
    enabled: true,
    mode: "rest",
    note: "\u0641\u0647\u0631\u0633 OAI \u0641\u0627\u0631\u063a - \u064a\u064f\u062d\u0635\u062f \u0639\u0628\u0631 REST",
    sets: [
      { spec: "col_123456789_347", label: "Doctorat en Math\u00e9matique & Informatique", purity: "mixed", degree: "doctorat" },
      { spec: "col_123456789_482", label: "Magister en Math\u00e9matique & Informatique", purity: "mixed", degree: "magister" },
      { spec: "col_123456789_1024", label: "Master II en Math\u00e9matique", purity: "pure", degree: "master" },
    ],
  },
  {
    key: "setif1",
    nameFr: "Universit\u00e9 Ferhat Abbas - S\u00e9tif 1",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0641\u0631\u062d\u0627\u062a \u0639\u0628\u0627\u0633 - \u0633\u0637\u064a\u0641 1",
    slug: "setif-1",
    wilaya: "\u0633\u0637\u064a\u0641",
    oai: "http://dspace.univ-setif.dz:8888/oai/request",
    version: 6,
    site: "http://dspace.univ-setif.dz:8888",
    enabled: false,
    note: "\u0641\u0647\u0631\u0633 OAI \u0641\u0627\u0631\u063a + DSpace 6 (REST \u0645\u062e\u062a\u0644\u0641)",
    sets: [
      { spec: "com_123456789_14", label: "D\u00e9partement de Math\u00e9matiques", purity: "pure" },
      { spec: "com_123456789_2969", label: "Math\u00e9matiques", purity: "pure" },
    ],
  },
];

export function repoByKey(key: string): RepoDef | undefined {
  return REPOS.find((r) => r.key === key);
}

export function enabledRepos(): RepoDef[] {
  return REPOS.filter((r) => r.enabled);
}

/** Repositories that can serve a direct PDF through the DSpace 7 REST API. */
export function supportsDirectPdf(slug: string): boolean {
  const r = REPOS.find((x) => x.slug === slug);
  return !!r && r.version === 7;
}
