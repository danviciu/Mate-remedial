import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const snapshotRoot = path.join(projectRoot, ".snapshots");

function parseSnapshotIdArg() {
  const arg = process.argv.find((entry) => entry.startsWith("--id="));
  if (!arg) return null;
  return arg.slice("--id=".length).trim() || null;
}

function readLatestSnapshotId() {
  const latestFile = path.join(snapshotRoot, "latest.txt");
  if (!fs.existsSync(latestFile)) return null;
  const value = fs.readFileSync(latestFile, "utf8").trim();
  return value || null;
}

function loadManifest(snapshotId) {
  const manifestPath = path.join(snapshotRoot, snapshotId, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function timestampId() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function safeCopy(fromPath, toPath) {
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.cpSync(fromPath, toPath, { recursive: true });
}

function createSafetySnapshot() {
  const id = `pre-restore-${timestampId()}`;
  const dir = path.join(snapshotRoot, id);
  fs.mkdirSync(dir, { recursive: true });

  const managedPaths = ["src", "public", "scripts", "package.json", "package-lock.json", "index.html", "vite.config.js", "postcss.config.js", "tailwind.config.js", "eslint.config.js", "README.md"];
  const copied = [];
  for (const relativePath of managedPaths) {
    const source = path.join(projectRoot, relativePath);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(dir, relativePath);
    safeCopy(source, destination);
    copied.push(relativePath);
  }

  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    projectRoot,
    paths: copied,
    note: "Snapshot de siguranta inainte de restore.",
  };
  fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return id;
}

function restoreSnapshot(snapshotId) {
  const manifest = loadManifest(snapshotId);
  if (!manifest) {
    console.error(`Snapshot inexistent: ${snapshotId}`);
    process.exit(1);
  }

  const safetyId = createSafetySnapshot();
  console.log(`Snapshot de siguranta creat: ${safetyId}`);

  for (const relativePath of manifest.paths ?? []) {
    const source = path.join(snapshotRoot, snapshotId, relativePath);
    const target = path.join(projectRoot, relativePath);
    if (!fs.existsSync(source)) continue;

    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    safeCopy(source, target);
  }

  console.log(`Restore complet din snapshot: ${snapshotId}`);
}

const requestedId = parseSnapshotIdArg();
const snapshotId = requestedId ?? readLatestSnapshotId();

if (!snapshotId) {
  console.error("Nu exista snapshot disponibil. Ruleaza mai intai: npm run snapshot");
  process.exit(1);
}

restoreSnapshot(snapshotId);
