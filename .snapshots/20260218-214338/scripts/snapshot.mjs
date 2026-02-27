import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const snapshotRoot = path.join(projectRoot, ".snapshots");

const MANAGED_PATHS = [
  "src",
  "public",
  "scripts",
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.js",
  "postcss.config.js",
  "tailwind.config.js",
  "eslint.config.js",
  "README.md",
];

function timestampId() {
  const now = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function copyEntry(fromPath, toPath) {
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  fs.cpSync(fromPath, toPath, { recursive: true });
}

function createSnapshot(id = timestampId()) {
  const snapshotDir = path.join(snapshotRoot, id);
  fs.mkdirSync(snapshotDir, { recursive: true });

  const copiedPaths = [];
  for (const relativePath of MANAGED_PATHS) {
    const source = path.join(projectRoot, relativePath);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(snapshotDir, relativePath);
    copyEntry(source, destination);
    copiedPaths.push(relativePath);
  }

  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    projectRoot,
    paths: copiedPaths,
  };
  fs.writeFileSync(path.join(snapshotDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(snapshotRoot, "latest.txt"), `${id}\n`);

  return manifest;
}

const manifest = createSnapshot();
console.log(`Snapshot creat: ${manifest.id}`);
console.log(`Locatie: ${path.join(snapshotRoot, manifest.id)}`);
