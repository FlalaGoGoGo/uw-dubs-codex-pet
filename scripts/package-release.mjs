import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist", "dubs-buddy");
const RELEASE_DIR = path.join(ROOT, "release");
const ZIP_PATH = path.join(RELEASE_DIR, "dubs-buddy-codex-pet.zip");
const VERSION_PATH = path.join(DIST_DIR, "VERSION.txt");

const files = {};

async function collect(directory, prefix) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const zipPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await collect(fullPath, zipPath);
    } else if (entry.isFile()) {
      files[zipPath] = new Uint8Array(await readFile(fullPath));
    }
  }
}

await mkdir(RELEASE_DIR, { recursive: true });
await collect(DIST_DIR, "dubs-buddy");
const version = (await readFile(VERSION_PATH, "utf8")).trim();
const versionedZipPath = path.join(RELEASE_DIR, `dubs-buddy-codex-pet-v${version}.zip`);
const zipBuffer = Buffer.from(zipSync(files, { level: 9 }));
await writeFile(ZIP_PATH, zipBuffer);
await writeFile(versionedZipPath, zipBuffer);

console.log(`Packaged ${ZIP_PATH}`);
console.log(`Packaged ${versionedZipPath}`);
