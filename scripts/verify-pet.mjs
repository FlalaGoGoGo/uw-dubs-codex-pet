import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT, "dist", "dubs-buddy");
const PET_JSON = path.join(DIST_DIR, "pet.json");
const SPRITESHEET = path.join(DIST_DIR, "spritesheet.png");
const VERSION_FILE = path.join(DIST_DIR, "VERSION.txt");
const BUILD_SCRIPT = path.join(ROOT, "scripts", "build-pet.mjs");
const MOTION_DIR = path.join(ROOT, "v3_1_motion_sources");
const PREVIEW_DIR = path.join(ROOT, "dist", "previews");
const GALLERY = path.join(ROOT, "dist", "gallery.html");
const TRANSITION_GALLERY = path.join(ROOT, "dist", "transition-gallery.html");
const RELEASE_PREVIEW = path.join(ROOT, "dist", "release-preview.html");
const DEMO_PREVIEW = path.join(ROOT, "dist", "demo", "dubs-buddy-v3.1.0-demo.webp");

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const COLUMNS = 8;
const ROWS = 9;
const EXPECTED_WIDTH = CELL_WIDTH * COLUMNS;
const EXPECTED_HEIGHT = CELL_HEIGHT * ROWS;
const PET_VERSION = "3.1.0";
const USED_COLUMNS_BY_ROW = Array.from({ length: ROWS }, () => COLUMNS);
const STATE_BY_ROW = [
  "idle",
  "running-right",
  "running-left",
  "waving",
  "jumping",
  "failed",
  "waiting",
  "running",
  "review"
];
const CORE_TRANSITIONS = [
  [0, 4, "idle -> hover"],
  [4, 6, "hover -> waiting"],
  [6, 7, "waiting -> running"],
  [7, 8, "running -> review"],
  [7, 5, "running -> failed"],
  [8, 0, "review -> idle"],
  [5, 0, "failed -> idle"]
];

const failures = [];
const driftReport = [];
const speckReport = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function main() {
  await verifyManifest();
  await verifyVersion();
  await verifyNoDefaultLogoOverlay();
  await verifyNoFinderDuplicates();
  await verifySpritesheet();
  await verifyMotionReferences();
  await verifyAnimatedPreviews();
  await verifyGallery();
  await verifyTransitionGallery();
  await verifyReleasePreview();
  await verifyDemoPreview();

  if (failures.length > 0) {
    console.error("Dubs Buddy verification failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("Dubs Buddy verification passed.");
  if (driftReport.length > 0) {
    console.log("Motion drift report:");
    for (const line of driftReport) console.log(`- ${line}`);
  }
  if (speckReport.length > 0) {
    console.log("Tiny isolated alpha component report:");
    for (const line of speckReport) console.log(`- ${line}`);
  }
}

async function verifyVersion() {
  try {
    const version = (await readFile(VERSION_FILE, "utf8")).trim();
    assert(version === PET_VERSION, `VERSION.txt must be ${PET_VERSION}.`);
  } catch (error) {
    failures.push(`Cannot read VERSION.txt: ${error.message}`);
  }
}

async function verifyNoDefaultLogoOverlay() {
  try {
    const source = await readFile(BUILD_SCRIPT, "utf8");
    assert(!source.includes("addCorrectLogoOverlay"), "build script must not include the old W overlay helper.");
    assert(!source.includes("frame.logo !== false"), "build script must not default to adding a W overlay.");
    assert(!source.includes('font-size="82"'), "build script must not contain the old generated W text overlay.");
    assert(!source.includes('scarfPolicy: "side-clean"'), "build script must not use the purple patch side-clean policy.");
    assert(!source.includes('src: "side-run"'), "build script must not use the old generated side-run SVG path.");
    assert(source.includes('src: "reference-sheet"'), "build script should use reference-sheet frames.");
    assert(source.includes("v2_8_references"), "build script should keep the V2.8 fallback reference sheets.");
    assert(source.includes("v3_1_references"), "build script should support V3.1 reference overrides.");
    assert(source.includes('scarfPolicy: "side-no-logo"'), "side-running rows should use no-logo scarf policy.");
    assert(source.includes('transitionSafe: true'), "build script should mark core rows transitionSafe.");
  } catch (error) {
    failures.push(`Cannot inspect build script for W overlay removal: ${error.message}`);
  }
}

async function verifyManifest() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(PET_JSON, "utf8"));
  } catch (error) {
    failures.push(`Cannot read pet.json: ${error.message}`);
    return;
  }

  assert(manifest.id === "dubs-buddy", "pet.json id must be dubs-buddy.");
  assert(manifest.displayName === "Dubs Buddy", "pet.json displayName must be Dubs Buddy.");
  assert(
    manifest.spritesheetPath === "spritesheet.png",
    "pet.json spritesheetPath must be spritesheet.png."
  );
  assert(
    !path.isAbsolute(manifest.spritesheetPath) &&
      !manifest.spritesheetPath.split(/[\\/]/).includes(".."),
    "spritesheetPath must be a relative path inside the pet folder."
  );
}

async function verifyNoFinderDuplicates() {
  const files = await walk(path.join(ROOT, "dist"));
  const duplicateFiles = files
    .filter((file) => / \d+(?=\.[^.]+$)/.test(path.basename(file)))
    .map((file) => path.relative(ROOT, file));
  assert(
    duplicateFiles.length === 0,
    `dist must not contain Finder/iCloud duplicate files: ${duplicateFiles.join(", ")}`
  );
}

async function verifySpritesheet() {
  let metadata;
  try {
    metadata = await sharp(SPRITESHEET).metadata();
  } catch (error) {
    failures.push(`Cannot read spritesheet.png: ${error.message}`);
    return;
  }

  assert(metadata.format === "png", "spritesheet must be PNG.");
  assert(metadata.width === EXPECTED_WIDTH, `spritesheet width must be ${EXPECTED_WIDTH}.`);
  assert(metadata.height === EXPECTED_HEIGHT, `spritesheet height must be ${EXPECTED_HEIGHT}.`);
  assert(metadata.hasAlpha === true, "spritesheet must include an alpha channel.");

  const { data, info } = await sharp(SPRITESHEET)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert(info.width === EXPECTED_WIDTH, "raw spritesheet width mismatch.");
  assert(info.height === EXPECTED_HEIGHT, "raw spritesheet height mismatch.");

  verifyTransparentCorners(data, info);
  verifyUsedCellsAreNotBlank(data, info);
  verifyUsedCellsAreNotDuplicates(data, info);
  verifyTinyIsolatedSpecks(data, info);
  verifyMotionDrift(data, info);
}

function verifyTransparentCorners(data, info) {
  const samples = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ];
  for (const [x, y] of samples) {
    const alpha = data[(y * info.width + x) * info.channels + 3];
    assert(alpha <= 5, `spritesheet corner (${x}, ${y}) should be transparent.`);
  }
}

function verifyMotionDrift(data, info) {
  for (let row = 0; row < ROWS; row += 1) {
    const boxes = [];
    for (let column = 0; column < COLUMNS; column += 1) {
      boxes.push(computeCellBox(data, info, row, column));
    }

    let maxCenterShift = 0;
    let maxSizeShift = 0;
    for (let column = 1; column < COLUMNS; column += 1) {
      const prev = boxes[column - 1];
      const current = boxes[column];
      if (!prev || !current) continue;
      maxCenterShift = Math.max(
        maxCenterShift,
        Math.hypot(current.centerX - prev.centerX, current.centerY - prev.centerY)
      );
      maxSizeShift = Math.max(
        maxSizeShift,
        Math.abs(current.width - prev.width),
        Math.abs(current.height - prev.height)
      );
    }

    driftReport.push(
      `row ${row} ${STATE_BY_ROW[row]}: max adjacent center shift ${maxCenterShift.toFixed(
        1
      )} px, size shift ${maxSizeShift.toFixed(1)} px`
    );
    assert(
      maxCenterShift <= 42,
      `row ${row} ${STATE_BY_ROW[row]} has a large adjacent center jump (${maxCenterShift.toFixed(1)} px).`
    );
    assert(
      maxSizeShift <= 88,
      `row ${row} ${STATE_BY_ROW[row]} has a large adjacent size jump (${maxSizeShift.toFixed(1)} px).`
    );
  }

  for (const [prevRow, nextRow, label] of CORE_TRANSITIONS) {
    const prevBox = computeCellBox(data, info, prevRow, COLUMNS - 1);
    const nextBox = computeCellBox(data, info, nextRow, 0);
    if (!prevBox || !nextBox) continue;
    const shift = Math.hypot(nextBox.centerX - prevBox.centerX, nextBox.centerY - prevBox.centerY);
    driftReport.push(
      `transition ${label}: endpoint center shift ${shift.toFixed(1)} px`
    );
    assert(
      shift <= 8,
      `transition ${label} endpoint center shift should be <= 8px, got ${shift.toFixed(1)} px.`
    );
  }
}

function computeCellBox(data, info, row, column) {
  let minX = CELL_WIDTH;
  let minY = CELL_HEIGHT;
  let maxX = -1;
  let maxY = -1;
  const startX = column * CELL_WIDTH;
  const startY = row * CELL_HEIGHT;
  for (let y = 0; y < CELL_HEIGHT; y += 1) {
    for (let x = 0; x < CELL_WIDTH; x += 1) {
      const alpha = data[((startY + y) * info.width + startX + x) * info.channels + 3];
      if (alpha <= 24) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2
  };
}

function verifyUsedCellsAreNotDuplicates(data, info) {
  for (let row = 0; row < ROWS; row += 1) {
    const hashes = new Set();
    for (let column = 0; column < COLUMNS; column += 1) {
      const hash = hashCell(data, info, row, column);
      assert(!hashes.has(hash), `row ${row}, column ${column} is an exact duplicate of an earlier frame.`);
      hashes.add(hash);
    }
  }
}

function hashCell(data, info, row, column) {
  let hash = 2166136261;
  const startX = column * CELL_WIDTH;
  const startY = row * CELL_HEIGHT;
  for (let y = startY; y < startY + CELL_HEIGHT; y += 1) {
    for (let x = startX; x < startX + CELL_WIDTH; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      for (let channel = 0; channel < 4; channel += 1) {
        hash ^= data[offset + channel];
        hash = Math.imul(hash, 16777619);
      }
    }
  }
  return hash >>> 0;
}

function verifyUsedCellsAreNotBlank(data, info) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < USED_COLUMNS_BY_ROW[row]; column += 1) {
      let opaquePixels = 0;
      for (let y = row * CELL_HEIGHT; y < (row + 1) * CELL_HEIGHT; y += 1) {
        for (let x = column * CELL_WIDTH; x < (column + 1) * CELL_WIDTH; x += 1) {
          const alpha = data[(y * info.width + x) * info.channels + 3];
          if (alpha > 24) opaquePixels += 1;
        }
      }
      assert(
        opaquePixels > 2000,
        `row ${row}, column ${column} appears blank or nearly blank.`
      );
    }
  }
}

function verifyTinyIsolatedSpecks(data, info) {
  for (let row = 0; row < ROWS; row += 1) {
    let tinyComponents = 0;
    let tinyPixels = 0;
    for (let column = 0; column < COLUMNS; column += 1) {
      const result = countTinyAlphaComponents(data, info, row, column);
      tinyComponents += result.components;
      tinyPixels += result.pixels;
    }
    speckReport.push(`row ${row} ${STATE_BY_ROW[row]}: ${tinyComponents} tiny components, ${tinyPixels} tiny pixels`);
    assert(
      tinyPixels <= 96,
      `row ${row} ${STATE_BY_ROW[row]} has too many tiny isolated alpha pixels (${tinyPixels}).`
    );
  }
}

function countTinyAlphaComponents(data, info, row, column) {
  const startX = column * CELL_WIDTH;
  const startY = row * CELL_HEIGHT;
  const visited = new Uint8Array(CELL_WIDTH * CELL_HEIGHT);
  let components = 0;
  let pixels = 0;

  const indexFor = (x, y) => y * CELL_WIDTH + x;
  const alphaAt = (x, y) => data[((startY + y) * info.width + startX + x) * info.channels + 3];

  for (let y = 0; y < CELL_HEIGHT; y += 1) {
    for (let x = 0; x < CELL_WIDTH; x += 1) {
      const startIndex = indexFor(x, y);
      if (visited[startIndex] || alphaAt(x, y) <= 24) continue;
      const queue = [[x, y]];
      visited[startIndex] = 1;
      let size = 0;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [cx, cy] = queue[cursor];
        size += 1;
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= CELL_WIDTH || ny >= CELL_HEIGHT) continue;
          const nextIndex = indexFor(nx, ny);
          if (visited[nextIndex] || alphaAt(nx, ny) <= 24) continue;
          visited[nextIndex] = 1;
          queue.push([nx, ny]);
        }
      }
      if (size <= 4) {
        components += 1;
        pixels += size;
      }
    }
  }

  return { components, pixels };
}

async function verifyMotionReferences() {
  for (const state of STATE_BY_ROW) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const file = path.join(MOTION_DIR, state, `frame-${String(column).padStart(2, "0")}.png`);
      try {
        const metadata = await sharp(file).metadata();
        assert(metadata.format === "png", `${file} must be PNG.`);
        assert(metadata.width === CELL_WIDTH, `${file} width must be ${CELL_WIDTH}.`);
        assert(metadata.height === CELL_HEIGHT, `${file} height must be ${CELL_HEIGHT}.`);
        assert(metadata.hasAlpha === true, `${file} must include alpha.`);
      } catch (error) {
        failures.push(`Cannot read V3.1 motion frame ${file}: ${error.message}`);
      }
    }
  }
}

async function verifyAnimatedPreviews() {
  for (let row = 0; row < ROWS; row += 1) {
    const state = STATE_BY_ROW[row];
    const file = path.join(PREVIEW_DIR, `${String(row).padStart(2, "0")}-${state}.webp`);
    try {
      await access(file);
      const metadata = await sharp(file, { animated: true }).metadata();
      assert(metadata.format === "webp", `${file} must be WebP.`);
      assert(metadata.width === CELL_WIDTH, `${file} width must be ${CELL_WIDTH}.`);
      assert(metadata.pageHeight === CELL_HEIGHT, `${file} pageHeight must be ${CELL_HEIGHT}.`);
      assert(metadata.pages === USED_COLUMNS_BY_ROW[row], `${file} must have ${USED_COLUMNS_BY_ROW[row]} pages.`);
    } catch (error) {
      failures.push(`Cannot read V3.1 animated preview ${file}: ${error.message}`);
    }
  }
}

async function verifyTransitionGallery() {
  try {
    const html = await readFile(TRANSITION_GALLERY, "utf8");
    assert(html.includes("Dubs Buddy V3.1 Transition Gallery"), "transition-gallery.html must be branded as V3.1.");
    for (const [fromRow, toRow] of CORE_TRANSITIONS) {
      const fileName = `${STATE_BY_ROW[fromRow]}-to-${STATE_BY_ROW[toRow]}.webp`;
      assert(html.includes(fileName), `transition-gallery.html should reference ${fileName}.`);
      const file = path.join(ROOT, "dist", "transitions", fileName);
      await access(file);
      const metadata = await sharp(file, { animated: true }).metadata();
      assert(metadata.format === "webp", `${file} must be WebP.`);
      assert(metadata.pages === 12, `${file} must have 12 pages.`);
      assert(metadata.pageHeight === CELL_HEIGHT, `${file} pageHeight must be ${CELL_HEIGHT}.`);
    }
  } catch (error) {
    failures.push(`Cannot verify transition gallery: ${error.message}`);
  }
}

async function verifyDemoPreview() {
  try {
    await access(DEMO_PREVIEW);
    const metadata = await sharp(DEMO_PREVIEW, { animated: true }).metadata();
    assert(metadata.format === "webp", "demo preview must be WebP.");
    assert(metadata.width === CELL_WIDTH, `demo preview width must be ${CELL_WIDTH}.`);
    assert(metadata.pageHeight === CELL_HEIGHT, `demo preview pageHeight must be ${CELL_HEIGHT}.`);
    assert(metadata.pages >= 40, "demo preview should include multiple state loops.");
  } catch (error) {
    failures.push(`Cannot verify demo preview: ${error.message}`);
  }
}

async function verifyGallery() {
  try {
    const html = await readFile(GALLERY, "utf8");
    assert(html.includes("Dubs Buddy V3.1 Motion Gallery"), "gallery.html must be branded as V3.1.");
    for (const state of STATE_BY_ROW) {
      assert(html.includes(`${state}.webp`), `gallery.html should reference ${state}.webp.`);
    }
  } catch (error) {
    failures.push(`Cannot read gallery.html: ${error.message}`);
  }
}

async function verifyReleasePreview() {
  try {
    const html = await readFile(RELEASE_PREVIEW, "utf8");
    assert(html.includes("V3.1"), "release-preview.html should show the V3.1 build.");
    assert(html.includes("preview-contact-sheet.png"), "release-preview.html should link to the contact sheet.");
  } catch (error) {
    failures.push(`Cannot read release-preview.html: ${error.message}`);
  }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

await main();
