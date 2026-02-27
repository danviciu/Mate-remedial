import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAllContentModules } from "../src/content/normalizeContent.js";
import { validateAllModulesContent } from "../src/content/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const moduleFiles = {
  fractions: "src/content/fractions.json",
  percents: "src/content/percentages.json",
  integers: "src/content/integers.json",
  equations: "src/content/equations.json",
};

function readJson(relativePath) {
  const fullPath = path.resolve(projectRoot, relativePath);
  const raw = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(raw);
}

function writeJson(relativePath, data) {
  const fullPath = path.resolve(projectRoot, relativePath);
  fs.writeFileSync(fullPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function buildValidationSnapshot(errors) {
  return errors.map((error) => ({
    path: error.path,
    message: error.message,
  }));
}

const rawModules = Object.fromEntries(
  Object.entries(moduleFiles).map(([moduleId, file]) => [moduleId, readJson(file)]),
);

const beforeErrors = validateAllModulesContent(rawModules);
const normalized = normalizeAllContentModules(rawModules, {
  regenerateInvalid: true,
  forceRegenerateAll: true,
});
const afterErrors = validateAllModulesContent(normalized.modules);

Object.entries(moduleFiles).forEach(([moduleId, file]) => {
  writeJson(file, normalized.modules[moduleId]);
});

const report = {
  generatedAt: new Date().toISOString(),
  beforeErrorCount: beforeErrors.length,
  afterErrorCount: afterErrors.length,
  fixedCount: normalized.report.fixedCount,
  unchangedCount: normalized.report.unchangedCount,
  stillInvalidCount: normalized.report.stillInvalidCount,
  stillInvalidItems: normalized.report.stillInvalidItems,
  beforeErrors: buildValidationSnapshot(beforeErrors).slice(0, 120),
  afterErrors: buildValidationSnapshot(afterErrors),
};

fs.writeFileSync(
  path.resolve(projectRoot, "content-fix-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  `fix:content complete. before=${beforeErrors.length}, after=${afterErrors.length}, fixed=${normalized.report.fixedCount}`,
);
