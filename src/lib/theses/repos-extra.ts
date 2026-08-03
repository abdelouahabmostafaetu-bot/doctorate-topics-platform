// Repositories discovered after the initial nationwide sweep.
// They live in their own file so adding a university stays a small, isolated
// commit instead of a rewrite of the main registry.
//
// Verified live on 2026-08-03 with OAI-PMH ListSets (230 sets exposed).

import type { RepoDef } from "./repos";

export const EXTRA_REPOS: RepoDef[] = [
  {
    key: "laghouat",
    nameFr: "Universit\u00e9 Amar Telidji - Laghouat",
    nameAr: "\u062c\u0627\u0645\u0639\u0629 \u0639\u0645\u0627\u0631 \u062b\u0644\u064a\u062c\u064a - \u0627\u0644\u0623\u063a\u0648\u0627\u0637",
    slug: "laghouat",
    wilaya: "\u0627\u0644\u0623\u063a\u0648\u0627\u0637",
    oai: "https://dspace.lagh-univ.dz/server/oai/request",
    version: 7,
    site: "https://dspace.lagh-univ.dz",
    enabled: true,
    note: "DSpace 7 - 13395 notices au total, OAI complet",
    sets: [
      {
        spec: "com_123456789_38",
        label: "Mathematics Department",
        purity: "pure",
      },
      {
        spec: "com_123456789_89",
        label: "Bachelor, Master (Mathematics)",
        purity: "pure",
      },
      {
        spec: "com_123456789_90",
        label: "Post Graduation (Mathematics)",
        purity: "pure",
      },
    ],
  },
];
