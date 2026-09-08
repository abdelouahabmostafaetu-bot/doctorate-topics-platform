/**
 * ============================================================================
 *  دمج التخصصات المكررة — Merge duplicate specialties (FR/EN) into one
 *  canonical bilingual list for docmathdz.dev (صفحة /world وكل الموقع)
 * ============================================================================
 *
 *  What it does / ماذا يفعل:
 *  1. Ensures the 23 canonical specialties exist with correct English `name`
 *     and Arabic `nameAr`        — يضمن وجود 23 تخصصًا موحدًا باسم إنجليزي وعربي
 *  2. Re-links every Topic from a duplicate specialty (Algèbre, EDP, Analysis,
 *     Topology, ...) to its canonical one. NO exam is ever deleted.
 *                                    — يعيد ربط كل موضوع بالتخصص الموحد دون حذف أي امتحان
 *  3. Deletes ONLY duplicate Specialty documents left with 0 topics AND 0 modules
 *                                    — يحذف فقط التخصصات المكررة الفارغة تمامًا
 *  4. Fills missing Arabic names of universities (never overwrites real Arabic)
 *                                    — يكمل أسماء الجامعات العربية الناقصة فقط
 *
 *  Idempotent — safe to run multiple times / آمن لإعادة التشغيل عدة مرات
 *
 *  Usage / التشغيل:
 *    node backup-db.mjs                            # 1) full backup first — نسخة احتياطية
 *    npx tsx scripts/merge-specialties.ts          # 2) dry-run, changes nothing — معاينة
 *    npx tsx scripts/merge-specialties.ts --apply  # 3) write changes — تنفيذ فعلي
 * ============================================================================
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// ---------- 1) Canonical specialties: English name + Arabic name ----------
// Order = suggested display order (pure / analysis / applied / probability...)
const CANONICAL: Array<{ name: string; nameAr: string }> = [
  { name: "Mathematics", nameAr: "الرياضيات" },
  { name: "Algebra", nameAr: "الجبر" },
  { name: "Real Analysis", nameAr: "التحليل الحقيقي" },
  { name: "Complex Analysis", nameAr: "التحليل العقدي" },
  { name: "Functional Analysis", nameAr: "التحليل الدالي" },
  { name: "Ordinary Differential Equations", nameAr: "المعادلات التفاضلية العادية" },
  { name: "Partial Differential Equations", nameAr: "المعادلات التفاضلية الجزئية" },
  { name: "Numerical Analysis & Optimization", nameAr: "التحليل العددي والأمثلية" },
  { name: "Geometry and Topology", nameAr: "الهندسة والطوبولوجيا" },
  { name: "Differential Geometry", nameAr: "الهندسة التفاضلية" },
  { name: "Discrete Mathematics", nameAr: "الرياضيات المتقطعة" },
  { name: "Logic", nameAr: "المنطق الرياضي" },
  { name: "Probability", nameAr: "نظرية الاحتمالات" },
  { name: "Statistics", nameAr: "علم الإحصاء" },
  { name: "Probability & Statistics", nameAr: "الاحتمالات والإحصاء" },
  { name: "Stochastic Processes and Machine Learning", nameAr: "العمليات العشوائية وتعلم الآلة" },
  { name: "Applied Mathematics", nameAr: "الرياضيات التطبيقية" },
  { name: "Computational Mathematics", nameAr: "الرياضيات الحاسوبية" },
  { name: "Biomathematics", nameAr: "الرياضيات الحيوية" },
  { name: "Dynamical Systems", nameAr: "الأنظمة الديناميكية" },
  { name: "Operations Research", nameAr: "بحوث العمليات" },
  { name: "Advanced Mathematical Modeling and Statistics", nameAr: "النمذجة الرياضية المتقدمة والإحصاء" },
  { name: "Advanced Mathematical Fundamentals", nameAr: "الأساسيات الرياضية المتقدمة" },
];

// ---------- 2) Merge map: duplicate name -> canonical name ----------
const MERGE: Record<string, string> = {
  "Algèbre": "Algebra",
  "Analysis": "Real Analysis",
  "Analyse Complexe": "Complex Analysis",
  "Analyse Fonctionnelle": "Functional Analysis",
  "Analyse Numérique & Optimisation": "Numerical Analysis & Optimization",
  "Numerical Analysis": "Numerical Analysis & Optimization",
  "EDP": "Partial Differential Equations",
  "Numerical PDE": "Partial Differential Equations",
  "Differential Equations": "Ordinary Differential Equations",
  "General Mathematics": "Mathematics",
  "Probabilités & Statistiques": "Probability & Statistics",
  "Regression Analysis": "Statistics",
  "Recherche Opérationnelle": "Operations Research",
  "Systèmes Dynamiques": "Dynamical Systems",
  "Biomathématiques": "Biomathematics",
  "Topology": "Geometry and Topology",
  "Advanced Fundamenta": "Advanced Mathematical Fundamentals",
};

// ---------- 3) Universities: fill Arabic name ONLY if missing / identical ----------
const UNIVERSITY_AR: Record<string, string> = {
  "US - Harvard University": "جامعة هارفارد",
  "US - Louisiana State University (LSU)": "جامعة ولاية لويزيانا",
  "US - Ohio State University (OSU)": "جامعة ولاية أوهايو",
  "US - University of California, Irvine (UCI)": "جامعة كاليفورنيا، إيرفاين",
  "US - University of California, Los Angeles (UCLA)": "جامعة كاليفورنيا، لوس أنجلوس",
  "US - University of Florida": "جامعة فلوريدا",
  "US - University of Iowa": "جامعة آيوا",
  "US - University of Maryland (UMD)": "جامعة ماريلاند",
  "US - University of Southern California (USC)": "جامعة جنوب كاليفورنيا",
  "US - University of Wisconsin-Madison (UW-Madison)": "جامعة ويسكونسن-ماديسون",
  "SG - National University of Singapore (NUS)": "الجامعة الوطنية لسنغافورة",
  "Université des Sciences et de la Technologie d'Oran (USTO)": "جامعة العلوم والتكنولوجيا - وهران",
  "École Nationale Supérieure de Statistique et d'Économie Appliquée (ENSSEA)":
    "المدرسة الوطنية العليا للإحصاء والاقتصاد التطبيقي",
  "École Normale Supérieure d'Enseignement Technologique de Skikda (ENSET Skikda)":
    "المدرسة العليا لأساتذة التعليم التكنولوجي - سكيكدة",
};

// Same slug convention as the site (lowercase, no accents, dashes)
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log(APPLY ? "\n🔧 MODE: APPLY (écriture réelle)\n" : "\n👀 MODE: DRY-RUN (rien n'est modifié — ajoute --apply pour exécuter)\n");

  const specialties = await prisma.specialty.findMany();
  const byName = new Map(specialties.map((s) => [s.name, s]));
  let created = 0, renamed = 0, relinked = 0, deleted = 0, unisFixed = 0;

  // --- Step 1: ensure canonical specialties exist with correct Arabic name ---
  console.log("== Étape 1 : spécialités canoniques ==");
  for (const c of CANONICAL) {
    const existing = byName.get(c.name);
    if (!existing) {
      console.log(`  + créer: ${c.name} / ${c.nameAr}`);
      if (APPLY) {
        const doc = await prisma.specialty.create({
          data: { name: c.name, nameAr: c.nameAr, slug: slugify(c.name) },
        });
        byName.set(c.name, doc);
      }
      created++;
    } else if (existing.nameAr !== c.nameAr) {
      console.log(`  ~ arabe: ${c.name}: «${existing.nameAr}» → «${c.nameAr}»`);
      if (APPLY) {
        await prisma.specialty.update({ where: { id: existing.id }, data: { nameAr: c.nameAr } });
      }
      renamed++;
    }
  }

  // --- Step 2: re-link topics from duplicates to canonical ---
  console.log("\n== Étape 2 : fusion des doublons (ré-affectation des sujets) ==");
  const emptyDuplicates: string[] = [];
  for (const [srcName, dstName] of Object.entries(MERGE)) {
    const src = byName.get(srcName);
    const dst = byName.get(dstName);
    if (!src) {
      console.log(`  ✓ «${srcName}» absent — déjà propre`);
      continue;
    }
    if (!dst) {
      console.log(`  ❌ CIBLE MANQUANTE: «${dstName}» — vérifie l'étape 1`);
      continue;
    }
    const count = await prisma.topic.count({ where: { specialtyId: src.id } });
    if (count > 0) {
      console.log(`  → ${String(count).padStart(4)} sujets: «${srcName}» → «${dstName}»`);
      if (APPLY) {
        await prisma.topic.updateMany({ where: { specialtyId: src.id }, data: { specialtyId: dst.id } });
      }
      relinked += count;
    } else {
      console.log(`  ✓ «${srcName}» n'a aucun sujet`);
    }
    emptyDuplicates.push(src.id);
  }

  // --- Step 3: delete ONLY fully-empty duplicate specialties ---
  console.log("\n== Étape 3 : suppression des doublons vides (0 sujet + 0 module) ==");
  for (const id of emptyDuplicates) {
    const topics = await prisma.topic.count({ where: { specialtyId: id } });
    const modules = await prisma.module.count({ where: { specialtyId: id } });
    const doc = specialties.find((s) => s.id === id);
    if (topics === 0 && modules === 0) {
      console.log(`  - supprimer: «${doc?.name}» (${doc?.slug})`);
      if (APPLY) {
        await prisma.specialty.delete({ where: { id } });
      }
      deleted++;
    } else {
      console.log(`  ⚠️ gardé (encore ${topics} sujets / ${modules} modules): «${doc?.name}»`);
    }
  }

  // --- Step 4: universities — fill missing Arabic names only ---
  console.log("\n== Étape 4 : noms arabes manquants des universités ==");
  for (const [name, nameAr] of Object.entries(UNIVERSITY_AR)) {
    const uni = await prisma.university.findUnique({ where: { name } });
    if (!uni) continue;
    if (!uni.nameAr || uni.nameAr === uni.name || /^[\x00-\x7F\s\p{P}\p{S}]*$/u.test(uni.nameAr)) {
      console.log(`  ~ ${name} → ${nameAr}`);
      if (APPLY) {
        await prisma.university.update({ where: { id: uni.id }, data: { nameAr } });
      }
      unisFixed++;
    }
  }

  // --- Verification summary ---
  console.log("\n== Vérification finale : sujets par spécialité ==");
  const finalSpecs = await prisma.specialty.findMany({ orderBy: { name: "asc" } });
  for (const s of finalSpecs) {
    const n = await prisma.topic.count({ where: { specialtyId: s.id } });
    console.log(`  ${String(n).padStart(4)}  ${s.name}  /  ${s.nameAr}`);
  }
  const totalTopics = await prisma.topic.count();
  console.log(`\n  TOTAL sujets: ${totalTopics} (doit rester inchangé avant/après)`);

  console.log("\n===== RÉSUMÉ =====");
  console.log(`Spécialités créées: ${created} | arabes corrigés: ${renamed}`);
  console.log(`Sujets ré-affectés: ${relinked} | doublons supprimés: ${deleted} | universités corrigées: ${unisFixed}`);
  if (!APPLY) console.log("\n⚠️ DRY-RUN — aucune écriture. Relance avec --apply pour appliquer.");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erreur:", e);
  await prisma.$disconnect();
  process.exit(1);
});
