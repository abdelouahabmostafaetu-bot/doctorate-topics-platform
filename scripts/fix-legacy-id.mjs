import fs from "fs";

const file = "src/app/admin/topics/actions.ts";
let content = fs.readFileSync(file, "utf8");
const before = content;

// 1) Define a guaranteed-unique legacyId right before problems parsing in createTopicAction.
const anchor1 = "const problems = parseProblems(problemsJson);";
if (!content.includes(anchor1)) {
  console.error(
    "FAILED: could not find anchor1 (const problems = parseProblems...). No changes made.",
  );
  process.exit(1);
}
if (!content.includes("const legacyId = `manual-${slug}-")) {
  content = content.replace(
    anchor1,
    "const legacyId = `manual-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;\n  " +
      anchor1,
  );
} else {
  console.log("legacyId definition already present, skipping insert.");
}

// 2) Insert legacyId into the prisma.topic.create data object, right before files: [].
const dataAnchorRegex = /(\bproblems,\s*\n\s*)files:\s*\[\],/;
if (!/legacyId,\s*\n\s*files:\s*\[\],/.test(content)) {
  if (!dataAnchorRegex.test(content)) {
    console.error(
      "FAILED: could not find data object anchor (problems, / files: [],). No changes made.",
    );
    process.exit(1);
  }
  content = content.replace(dataAnchorRegex, "$1legacyId,\n      files: [],");
} else {
  console.log("legacyId already present in data object, skipping insert.");
}

if (content === before) {
  console.log("No changes were necessary (already patched).");
} else {
  fs.writeFileSync(file, content, "utf8");
  console.log("Patched", file, "successfully.");
}
