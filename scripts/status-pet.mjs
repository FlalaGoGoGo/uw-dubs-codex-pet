import { access, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist", "dubs-buddy");
const INSTALLED_DIR = path.join(os.homedir(), ".codex", "pets", "dubs-buddy");
const EXPECTED_VERSION = "3.1.0";
const EXPECTED_WIDTH = 1536;
const EXPECTED_HEIGHT = 1872;

await printPetStatus();

async function printPetStatus() {
  console.log("Dubs Buddy status");
  console.log("=================");
  await printLocation("dist", DIST_DIR);
  await printLocation("installed", INSTALLED_DIR);
  console.log("");
  console.log(`Expected version: ${EXPECTED_VERSION}`);
}

async function printLocation(label, dir) {
  const versionFile = path.join(dir, "VERSION.txt");
  const sheetFile = path.join(dir, "spritesheet.png");
  const manifestFile = path.join(dir, "pet.json");

  console.log("");
  console.log(`${label}: ${dir}`);

  if (!(await exists(dir))) {
    console.log("  status: missing");
    return;
  }

  const version = await readTextOr(versionFile, "unknown");
  console.log(`  version: ${version.trim() || "unknown"}`);

  try {
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    console.log(`  manifest: ${manifest.id ?? "unknown"} -> ${manifest.spritesheetPath ?? "missing"}`);
  } catch (error) {
    console.log(`  manifest: unreadable (${error.message})`);
  }

  try {
    const metadata = await sharp(sheetFile).metadata();
    const sheetStat = await stat(sheetFile);
    const sizeOk = metadata.width === EXPECTED_WIDTH && metadata.height === EXPECTED_HEIGHT;
    console.log(`  spritesheet: ${metadata.width}x${metadata.height} ${metadata.format}${sizeOk ? " OK" : " WRONG SIZE"}`);
    console.log(`  modified: ${sheetStat.mtime.toISOString()}`);
  } catch (error) {
    console.log(`  spritesheet: unreadable (${error.message})`);
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTextOr(filePath, fallback) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return fallback;
  }
}
