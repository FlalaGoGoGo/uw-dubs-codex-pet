import { cp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "dubs-buddy";
const displayName = "Dubs Buddy";
const SOURCE_DIR = path.join(ROOT, "dist", packageName);
const TARGET_DIR = path.join(os.homedir(), ".codex", "pets", packageName);

await mkdir(path.dirname(TARGET_DIR), { recursive: true });
await rm(TARGET_DIR, { recursive: true, force: true });
await cp(SOURCE_DIR, TARGET_DIR, { recursive: true });

console.log(`Installed ${displayName} to ${TARGET_DIR}`);
console.log(`In Codex Desktop: Appearance -> Pets -> Refresh -> ${displayName} -> Wake Pet`);
