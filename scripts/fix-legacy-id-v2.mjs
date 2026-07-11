import fs from "fs";

const file = "src/app/admin/topics/actions.ts";
let content = fs.readFileSync(file, "utf8");
const before = content;

// Remove the previous (incorrect, string-typed) legacyId definition if present.
const oldDefRegex = /const legacyId = `manual-\$\{slug\}-[^`]*`;\s*\n\s*/;
if (oldDefRegex.test(content)) {
  content = content.replace(oldDefRegex, "");
  console.log("Removed old string-based legacyId definition.");
}

// Insert a numeric, collision-checked legacyId definition before problems parsing.
const anchor = "const problems = parseProblems(problemsJson);";
if (!content.includes(anchor)) {
  console.error(
    "FAILED: could not find anchor (const problems = parseProblems...). No changes made.",
  );
  process.exit(1);
}
if (!content.includes("let legacyId = Math.floor(100000000")) {
  const numericBlock =
    "let legacyId = Math.floor(100000000 + Math.random() * 900000000);\n  " +
    "while (await prisma.topic.findUnique({ where: { legacyId } })) {\n    " +
    "legacyId = Math.floor(100000000 + Math.random() * 900000000);\n  }\n  ";
  content = content.replace(anchor, numericBlock + anchor);
  console.log("Inserted numeric legacyId generator.");
} else {
  console.log("Numeric legacyId generator already present, skipping insert.");
}

if (content === before) {
  console.log("No changes were necessary (already patched).");
} else {
  fs.writeFileSync(file, content, "utf8");
  console.log("Patched", file, "successfully.");
}
