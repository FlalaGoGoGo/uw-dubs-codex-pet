import { access, mkdir, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const COLUMNS = 8;
const ROWS = 9;
const SPRITESHEET_WIDTH = CELL_WIDTH * COLUMNS;
const SPRITESHEET_HEIGHT = CELL_HEIGHT * ROWS;
const PET_VERSION = "3.1.0";
const MOTION_DIR_NAME = path.join("generated", "motion-sources");
const DIST_PACKAGE_NAME = "dubs-buddy";
const PET_ID = "dubs-buddy";
const PET_DISPLAY_NAME = "Dubs Buddy";
const PET_DESCRIPTION = "Created by a UW Foster master's student for Codex Desktop.";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const CORE_TRANSITIONS = [
  ["idle", "jumping", "idle -> hover"],
  ["jumping", "waiting", "hover -> waiting"],
  ["waiting", "running", "waiting -> running"],
  ["running", "review", "running -> review"],
  ["running", "failed", "running -> failed"],
  ["review", "idle", "review -> idle"],
  ["failed", "idle", "failed -> idle"]
];

const REFERENCE_SHEETS = {
  idle: {
    rel: "references/source-sheets/idle.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    normalizeBottomY: 192,
    smartSlice: true
  },
  "running-right": {
    rel: "references/source-sheets/running-right.png",
    columns: 4,
    rows: 2,
    normalizeBottomY: 189
  },
  "running-left": {
    columns: 4,
    rows: 2,
    normalizeBottomY: 189,
    optional: true,
    fallbackMirror: "running-right"
  },
  waving: {
    rel: "references/source-sheets/waving.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    normalizeBottomY: 199,
    smartSlice: true
  },
  jumping: {
    rel: "references/source-sheets/jumping.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95
  },
  failed: {
    rel: "references/source-sheets/failed-sad-crying.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    normalizeCenterY: 105,
    smartSlice: true
  },
  waiting: {
    rel: "references/source-sheets/waiting-hourglass.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    normalizeCenterY: 104,
    stripPaleNoise: true,
    keepLargestAfterPaleStrip: true,
    smartSlice: true
  },
  running: {
    rel: "references/source-sheets/running-working.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    normalizeCenterY: 104,
    smartSlice: true
  },
  review: {
    rel: "references/source-sheets/review-success-gift-box.png",
    columns: 4,
    rows: 2,
    normalizeCenterX: 95,
    smartSlice: true
  }
};

const EIGHT_FRAME_ANCHORS = [
  "neutral",
  "settle",
  "peak",
  "peak",
  "peak",
  "settle",
  "settle",
  "neutral"
];

function referenceSheetFrames(sheet, frameOverrides = {}) {
  return Array.from({ length: COLUMNS }, (_, index) => ({
    anchor: EIGHT_FRAME_ANCHORS[index],
    src: "reference-sheet",
    sheet,
    index,
    ...(frameOverrides[index] ?? {})
  }));
}

const ROW_DEFINITIONS = [
  {
    state: "idle",
    row: 0,
    delay: 170,
    family: "core idle",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "V3.1 breathing, blink, ears, and tail idle",
    frames: referenceSheetFrames("idle")
  },
  {
    state: "running-right",
    row: 1,
    delay: 95,
    family: "core side run",
    scarfPolicy: "side-no-logo",
    note: "Right-facing side run from V2.8 reference sheet",
    frames: referenceSheetFrames("running-right")
  },
  {
    state: "running-left",
    row: 2,
    delay: 95,
    family: "core side run",
    scarfPolicy: "side-no-logo",
    note: "Left-facing side run mirrored from no-logo V2.8 sheet",
    frames: referenceSheetFrames("running-left")
  },
  {
    state: "waving",
    row: 3,
    delay: 170,
    family: "tiny-paw alias",
    scarfPolicy: "keep-original",
    note: "V3.1 gentle greeting and paw wave",
    frames: referenceSheetFrames("waving")
  },
  {
    state: "jumping",
    row: 4,
    delay: 150,
    family: "core jump",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "Real jump from V2.8 reference sheet",
    frames: referenceSheetFrames("jumping", {
      0: { y: -11 }
    })
  },
  {
    state: "failed",
    row: 5,
    delay: 160,
    family: "core failed",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "V3.1 sad and crying failed state",
    frames: referenceSheetFrames("failed")
  },
  {
    state: "waiting",
    row: 6,
    delay: 170,
    family: "core waiting",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "V3.1 hourglass waiting state",
    frames: referenceSheetFrames("waiting")
  },
  {
    state: "running",
    row: 7,
    delay: 135,
    family: "core working",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "V3.1 laptop typing work state",
    frames: referenceSheetFrames("running")
  },
  {
    state: "review",
    row: 8,
    delay: 150,
    family: "core review",
    transitionSafe: true,
    scarfPolicy: "keep-original",
    note: "V3.1 gift-box success state",
    frames: referenceSheetFrames("review", {
      0: { y: -21 }
    })
  }
];

const processedDir = path.join(ROOT, "assets", "processed");
const motionDir = path.join(ROOT, MOTION_DIR_NAME);
const legacyMotionDirNames = [
  "v2_motion_references",
  "v2_5_motion_sources",
  "v2_6_motion_sources",
  "v2_7_motion_sources",
  "v2_8_motion_sources",
  "v3_0_motion_sources",
  "v3_1_motion_sources"
];
const referenceSheetDir = path.join(ROOT, "references", "source-sheets");
const distDir = path.join(ROOT, "dist", DIST_PACKAGE_NAME);
const previewDir = path.join(ROOT, "dist", "previews");
const transitionDir = path.join(ROOT, "dist", "transitions");
const demoDir = path.join(ROOT, "dist", "demo");
const releaseDir = path.join(ROOT, "release");

async function main() {
  await assertSourceImages();
  await rm(processedDir, { recursive: true, force: true });
  for (const dirName of legacyMotionDirNames) {
    await rm(path.join(ROOT, dirName), { recursive: true, force: true });
  }
  await rm(motionDir, { recursive: true, force: true });
  await rm(distDir, { recursive: true, force: true });
  await rm(previewDir, { recursive: true, force: true });
  await rm(transitionDir, { recursive: true, force: true });
  await rm(demoDir, { recursive: true, force: true });
  await mkdir(motionDir, { recursive: true });
  await mkdir(referenceSheetDir, { recursive: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(previewDir, { recursive: true });
  await mkdir(transitionDir, { recursive: true });
  await mkdir(demoDir, { recursive: true });
  await mkdir(releaseDir, { recursive: true });

  const motionFrames = await buildMotionFrames(new Map());
  const spritesheet = await buildSpritesheet(motionFrames);

  await writeFile(path.join(distDir, "spritesheet.png"), spritesheet);
  await writeFile(
    path.join(distDir, "pet.json"),
    `${JSON.stringify(
      {
        id: PET_ID,
        displayName: PET_DISPLAY_NAME,
        description: PET_DESCRIPTION,
        spritesheetPath: "spritesheet.png"
      },
      null,
      2
    )}\n`
  );
  await writeFile(
    path.join(distDir, "STATE_MAPPING.md"),
    renderStateMappingMarkdown()
  );
  await writeFile(
    path.join(distDir, "README_INSTALL.txt"),
    renderInstallText()
  );
  await writeFile(path.join(distDir, "VERSION.txt"), `${PET_VERSION}\n`);

  await buildPreviewContactSheet(spritesheet);
  await buildAnimatedPreviews(motionFrames);
  await buildGallery();
  await buildTransitionGallery(motionFrames);
  await buildDemoPreview(motionFrames);
  await buildReleasePreview();
  await removeFinderDuplicateFiles(path.join(ROOT, "dist"));
  console.log(`Built ${path.relative(ROOT, path.join(distDir, "spritesheet.png"))}`);
  console.log(`Built ${path.relative(ROOT, "dist/preview-contact-sheet.png")}`);
  console.log(`Built ${path.relative(ROOT, previewDir)}/*.webp`);
  console.log(`Built ${path.relative(ROOT, "dist/gallery.html")}`);
  console.log(`Built ${path.relative(ROOT, "dist/transition-gallery.html")}`);
  console.log(`Built ${path.relative(ROOT, `dist/demo/dubs-buddy-v${PET_VERSION}-demo.webp`)}`);
  console.log(`Built ${path.relative(ROOT, "dist/release-preview.html")}`);
}

async function removeFinderDuplicateFiles(dir) {
  if (!(await exists(dir))) return;
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await removeFinderDuplicateFiles(absolute);
      } else if (entry.isFile() && / \d+(?=\.[^.]+$)/.test(entry.name)) {
        await unlink(absolute);
      }
    })
  );
}

async function assertSourceImages() {
  await Promise.all(
    Object.entries(REFERENCE_SHEETS).map(async ([name, config]) => {
      const resolved = await resolveReferenceSheetConfig(name, config);
      if (!resolved) return;
      const rel = resolved.resolvedRel;
      try {
        const metadata = await sharp(path.join(ROOT, rel)).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error("missing dimensions");
        }
        if (metadata.width < config.columns || metadata.height < config.rows) {
          throw new Error("image too small for configured grid");
        }
      } catch (error) {
        throw new Error(`Missing or unreadable reference sheet "${name}" at ${rel}: ${error.message}`);
      }
    })
  );
}

async function resolveReferenceSheetConfig(name, config) {
  const candidates = [config.rel].filter(Boolean);
  for (const rel of candidates) {
    if (await exists(path.join(ROOT, rel))) {
      return {
        ...config,
        resolvedRel: rel,
        sourceTier: "reference"
      };
    }
  }
  if (config.optional) return null;
  throw new Error(`Missing reference sheet "${name}". Tried: ${candidates.join(", ")}`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function processSources() {
  const processed = new Map();
  for (const [name, rel] of Object.entries(SOURCE_IMAGES)) {
    const inputPath = path.join(ROOT, rel);
    const outputPath = path.join(processedDir, `${name}.png`);
    await removeConnectedWhiteBackground(inputPath, outputPath);
    processed.set(name, outputPath);
  }
  return processed;
}

async function removeConnectedWhiteBackground(inputPath, outputPath) {
  const cleaned = await removeConnectedBackgroundBuffer(await readFile(inputPath));
  await writeFile(outputPath, cleaned);
}

async function removeConnectedBackgroundBuffer(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgba = Buffer.from(data);
  const bg = estimateBackgroundColor(rgba, width, height, channels);
  const visited = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx] || !isBackgroundCandidate(rgba, idx * channels, bg)) return;
    visited[idx] = 1;
    queue.push(idx);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const idx = queue[cursor];
    const x = idx % width;
    const y = Math.floor(idx / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let idx = 0; idx < visited.length; idx += 1) {
    if (visited[idx]) {
      rgba[idx * channels + 3] = 0;
    }
  }

  return sharp(rgba, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

async function removeReferenceBackgroundBuffer(inputBuffer) {
  const connectedCleaned = await removeConnectedBackgroundBuffer(inputBuffer);
  const { data, info } = await sharp(connectedCleaned)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgba = Buffer.from(data);
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || !isReferenceBackgroundCandidate(rgba, start * channels)) continue;
      const queue = [start];
      const pixels = [];
      visited[start] = 1;
      let touchesEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const idx = queue[cursor];
        const px = idx % width;
        const py = Math.floor(idx / width);
        pixels.push(idx);
        if (px === 0 || py === 0 || px === width - 1 || py === height - 1) {
          touchesEdge = true;
        }
        const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          const nx = next % width;
          if ((next === idx - 1 && nx !== px - 1) || (next === idx + 1 && nx !== px + 1)) {
            continue;
          }
          if (!isReferenceBackgroundCandidate(rgba, next * channels)) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (touchesEdge || pixels.length >= 64) {
        for (const idx of pixels) {
          rgba[idx * channels + 3] = 0;
        }
      }
    }
  }

  return sharp(rgba, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

function estimateBackgroundColor(data, width, height, channels) {
  const sample = 16;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const ranges = [
    [0, 0],
    [width - sample, 0],
    [0, height - sample],
    [width - sample, height - sample]
  ];

  for (const [startX, startY] of ranges) {
    for (let y = startY; y < Math.min(startY + sample, height); y += 1) {
      for (let x = startX; x < Math.min(startX + sample, width); x += 1) {
        const offset = (y * width + x) * channels;
        r += data[offset];
        g += data[offset + 1];
        b += data[offset + 2];
        count += 1;
      }
    }
  }

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  };
}

function isBackgroundCandidate(data, offset, bg) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const dist = Math.hypot(r - bg.r, g - bg.g, b - bg.b);
  return min >= 214 && max - min <= 34 && dist <= 68;
}

function isReferenceBackgroundCandidate(data, offset) {
  const alpha = data[offset + 3];
  if (alpha <= 24) return false;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (min >= 235 && max - min <= 14) || (min >= 248 && max - min <= 22);
}

async function buildReferenceSheetFrames() {
  let runningRight = await sliceReferenceSheet("running-right", REFERENCE_SHEETS["running-right"]);
  runningRight = await postProcessReferenceFrames(runningRight, REFERENCE_SHEETS["running-right"]);
  const runningLeftConfig = await resolveReferenceSheetConfig("running-left", REFERENCE_SHEETS["running-left"]);
  let runningLeft;
  if (runningLeftConfig) {
    runningLeft = await sliceReferenceSheet("running-left", REFERENCE_SHEETS["running-left"]);
    runningLeft = await postProcessReferenceFrames(runningLeft, REFERENCE_SHEETS["running-left"]);
  } else {
    runningLeft = await Promise.all(
      runningRight.map((buffer) => sharp(buffer).flop().png().toBuffer())
    );
  }
  const referenceFrames = new Map([
    ["running-right", runningRight],
    ["running-left", runningLeft]
  ]);

  for (const [name, config] of Object.entries(REFERENCE_SHEETS)) {
    if (name === "running-right" || name === "running-left") continue;
    let frames = await sliceReferenceSheet(name, config);
    frames = await postProcessReferenceFrames(frames, config);
    referenceFrames.set(name, frames);
  }

  return referenceFrames;
}

async function postProcessReferenceFrames(frames, config) {
  if (config.stripPaleNoise) {
    frames = await stripPaleNoiseFrames(frames, {
      keepLargest: config.keepLargestAfterPaleStrip === true
    });
  }
  if (config.normalizeCenterX) {
    frames = await normalizeFrameCenterX(frames, config.normalizeCenterX);
  }
  if (config.normalizeCenterY) {
    frames = await normalizeFrameCenterY(frames, config.normalizeCenterY);
  }
  if (config.normalizeBottomY) {
    frames = await normalizeFrameBottomY(frames, config.normalizeBottomY);
  }
  return frames;
}

async function sliceReferenceSheet(name, config) {
  const resolved = await resolveReferenceSheetConfig(name, config);
  if (!resolved) {
    throw new Error(`No reference sheet available for "${name}".`);
  }
  if (resolved.smartSlice) {
    return sliceReferenceSheetSmart(name, resolved);
  }
  const sheetPath = path.join(ROOT, resolved.resolvedRel);
  const metadata = await sharp(sheetPath).metadata();
  const cells = [];
  const normalizedCellWidth = Math.ceil(metadata.width / config.columns);
  const normalizedCellHeight = Math.ceil(metadata.height / config.rows);

  for (let index = 0; index < COLUMNS; index += 1) {
    const column = index % config.columns;
    const row = Math.floor(index / config.columns);
    const left = Math.round((column * metadata.width) / config.columns);
    const top = Math.round((row * metadata.height) / config.rows);
    const right = Math.round(((column + 1) * metadata.width) / config.columns);
    const bottom = Math.round(((row + 1) * metadata.height) / config.rows);
    const width = right - left;
    const height = bottom - top;
    const extracted = await sharp(sheetPath)
      .extract({ left, top, width, height })
      .png()
      .toBuffer();
    const normalized = await sharp(extracted)
      .extend({
        top: 0,
        left: 0,
        right: normalizedCellWidth - width,
        bottom: normalizedCellHeight - height,
        background: TRANSPARENT
      })
      .png()
      .toBuffer();
    const cleaned = await removeConnectedBackgroundBuffer(normalized);
    const box = await computeAlphaBox(cleaned);
    if (!box) {
      throw new Error(`Reference sheet "${name}" frame ${index} is blank after background removal.`);
    }
    cells.push({ buffer: cleaned, box, width: normalizedCellWidth, height: normalizedCellHeight });
  }

  const padding = 18;
  const union = cells.reduce(
    (acc, cell) => ({
      minX: Math.min(acc.minX, cell.box.minX),
      minY: Math.min(acc.minY, cell.box.minY),
      maxX: Math.max(acc.maxX, cell.box.maxX),
      maxY: Math.max(acc.maxY, cell.box.maxY)
    }),
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: -1, maxY: -1 }
  );
  const crop = {
    left: clamp(Math.floor(union.minX - padding), 0, cells[0].width - 1),
    top: clamp(Math.floor(union.minY - padding), 0, cells[0].height - 1),
    right: clamp(Math.ceil(union.maxX + padding), 0, cells[0].width - 1),
    bottom: clamp(Math.ceil(union.maxY + padding), 0, cells[0].height - 1)
  };
  const cropWidth = crop.right - crop.left + 1;
  const cropHeight = crop.bottom - crop.top + 1;

  return Promise.all(
    cells.map((cell) =>
      sharp(cell.buffer)
        .extract({ left: crop.left, top: crop.top, width: cropWidth, height: cropHeight })
        .resize(CELL_WIDTH, CELL_HEIGHT, {
          fit: "contain",
          background: TRANSPARENT,
          kernel: "lanczos3"
        })
        .png()
        .toBuffer()
    )
  );
}

async function sliceReferenceSheetSmart(name, config) {
  const sheetPath = path.join(ROOT, config.resolvedRel);
  const metadata = await sharp(sheetPath).metadata();
  const cells = [];
  const normalizedCellWidth = Math.ceil(metadata.width / config.columns);
  const normalizedCellHeight = Math.ceil(metadata.height / config.rows);
  const bleed = config.bleed ?? 86;
  const canvasWidth = normalizedCellWidth + bleed * 2;
  const canvasHeight = normalizedCellHeight + bleed * 2;

  for (let index = 0; index < COLUMNS; index += 1) {
    const column = index % config.columns;
    const row = Math.floor(index / config.columns);
    const nominalLeft = Math.round((column * metadata.width) / config.columns);
    const nominalTop = Math.round((row * metadata.height) / config.rows);
    const nominalRight = Math.round(((column + 1) * metadata.width) / config.columns);
    const nominalBottom = Math.round(((row + 1) * metadata.height) / config.rows);
    const extractLeft = clamp(nominalLeft - bleed, 0, metadata.width - 1);
    const extractTop = clamp(nominalTop - bleed, 0, metadata.height - 1);
    const extractRight = clamp(nominalRight + bleed, extractLeft + 1, metadata.width);
    const extractBottom = clamp(nominalBottom + bleed, extractTop + 1, metadata.height);
    const extracted = await sharp(sheetPath)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractRight - extractLeft,
        height: extractBottom - extractTop
      })
      .png()
      .toBuffer();
    const cleaned = await removeReferenceBackgroundBuffer(extracted);
    const padded = await sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: TRANSPARENT
      }
    })
      .composite([
        {
          input: cleaned,
          left: extractLeft - (nominalLeft - bleed),
          top: extractTop - (nominalTop - bleed)
        }
      ])
      .png()
      .toBuffer();
    const filtered = await keepReferenceCellComponents(padded, {
      width: canvasWidth,
      height: canvasHeight,
      nominal: {
        left: bleed,
        top: bleed,
        width: nominalRight - nominalLeft,
        height: nominalBottom - nominalTop
      }
    });
    const box = await computeAlphaBox(filtered);
    if (!box) {
      throw new Error(`Reference sheet "${name}" frame ${index} is blank after smart slicing.`);
    }
    cells.push({ buffer: filtered, box, width: canvasWidth, height: canvasHeight });
  }

  const padding = 18;
  const union = cells.reduce(
    (acc, cell) => ({
      minX: Math.min(acc.minX, cell.box.minX),
      minY: Math.min(acc.minY, cell.box.minY),
      maxX: Math.max(acc.maxX, cell.box.maxX),
      maxY: Math.max(acc.maxY, cell.box.maxY)
    }),
    { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: -1, maxY: -1 }
  );
  const crop = {
    left: clamp(Math.floor(union.minX - padding), 0, cells[0].width - 1),
    top: clamp(Math.floor(union.minY - padding), 0, cells[0].height - 1),
    right: clamp(Math.ceil(union.maxX + padding), 0, cells[0].width - 1),
    bottom: clamp(Math.ceil(union.maxY + padding), 0, cells[0].height - 1)
  };
  const cropWidth = crop.right - crop.left + 1;
  const cropHeight = crop.bottom - crop.top + 1;

  return Promise.all(
    cells.map((cell) =>
      sharp(cell.buffer)
        .extract({ left: crop.left, top: crop.top, width: cropWidth, height: cropHeight })
        .resize(CELL_WIDTH, CELL_HEIGHT, {
          fit: "contain",
          background: TRANSPARENT,
          kernel: "lanczos3"
        })
        .png()
        .toBuffer()
    )
  );
}

async function keepReferenceCellComponents(buffer, { width, height, nominal }) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  const components = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || rgba[start * info.channels + 3] <= 24) continue;
      const queue = [start];
      const pixels = [];
      visited[start] = 1;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const idx = queue[cursor];
        const px = idx % width;
        const py = Math.floor(idx / width);
        pixels.push(idx);
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
        sumX += px;
        sumY += py;
        const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          const nx = next % width;
          if ((next === idx - 1 && nx !== px - 1) || (next === idx + 1 && nx !== px + 1)) {
            continue;
          }
          if (rgba[next * info.channels + 3] <= 24) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      components.push({
        pixels,
        area: pixels.length,
        minX,
        minY,
        maxX,
        maxY,
        centerX: sumX / pixels.length,
        centerY: sumY / pixels.length
      });
    }
  }

  if (components.length <= 1) return buffer;

  const expectedCenterX = nominal.left + nominal.width / 2;
  const expectedCenterY = nominal.top + nominal.height / 2;
  const main = components.reduce((best, component) => {
    const score =
      component.area -
      Math.hypot(component.centerX - expectedCenterX, component.centerY - expectedCenterY) * 14;
    if (!best || score > best.score) return { component, score };
    return best;
  }, null).component;
  const keep = new Set([main]);

  for (const component of components) {
    if (component === main || component.area < 10) continue;
    const distanceToMain = distanceFromPointToBox(component.centerX, component.centerY, main);
    const distanceToExpected = Math.hypot(
      component.centerX - expectedCenterX,
      component.centerY - expectedCenterY
    );
    const overlapsSubjectZone = boxesOverlap(component, {
      minX: nominal.left - 24,
      minY: nominal.top - 40,
      maxX: nominal.left + nominal.width + 24,
      maxY: nominal.top + nominal.height + 40
    });
    if (distanceToMain <= 72 && distanceToExpected <= 170 && overlapsSubjectZone) {
      keep.add(component);
    }
  }

  for (const component of components) {
    if (keep.has(component)) continue;
    for (const idx of component.pixels) {
      rgba[idx * info.channels + 3] = 0;
    }
  }

  return sharp(rgba, { raw: { width, height, channels: info.channels } })
    .png()
    .toBuffer();
}

function distanceFromPointToBox(x, y, box) {
  const dx = x < box.minX ? box.minX - x : x > box.maxX ? x - box.maxX : 0;
  const dy = y < box.minY ? box.minY - y : y > box.maxY ? y - box.maxY : 0;
  return Math.hypot(dx, dy);
}

function boxesOverlap(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

async function stripPaleNoiseFrames(frames, { keepLargest = false } = {}) {
  return Promise.all(
    frames.map(async (buffer) => {
      let cleaned = await stripPaleNoise(buffer);
      if (keepLargest) {
        cleaned = await keepLargestAlphaComponent(cleaned);
      }
      return cleaned;
    })
  );
}

async function stripPaleNoise(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.from(data);
  for (let idx = 0; idx < info.width * info.height; idx += 1) {
    const offset = idx * info.channels;
    const alpha = rgba[offset + 3];
    if (alpha <= 24) continue;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    if (alpha < 220 && min > 230 && max - min < 40) {
      rgba[offset + 3] = 0;
    }
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

async function keepLargestAlphaComponent(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rgba = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  let largest = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start] || rgba[start * channels + 3] <= 24) continue;
      const queue = [start];
      const pixels = [];
      visited[start] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const idx = queue[cursor];
        const px = idx % width;
        pixels.push(idx);
        const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
        for (const next of neighbors) {
          if (next < 0 || next >= visited.length || visited[next]) continue;
          const nx = next % width;
          if ((next === idx - 1 && nx !== px - 1) || (next === idx + 1 && nx !== px + 1)) {
            continue;
          }
          if (rgba[next * channels + 3] <= 24) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      if (pixels.length > largest.length) largest = pixels;
    }
  }

  if (largest.length === 0) return buffer;
  const keep = new Set(largest);
  for (let idx = 0; idx < width * height; idx += 1) {
    if (rgba[idx * channels + 3] > 24 && !keep.has(idx)) {
      rgba[idx * channels + 3] = 0;
    }
  }

  return sharp(rgba, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

async function normalizeFrameCenterX(frames, targetCenterX) {
  return Promise.all(
    frames.map(async (buffer) => {
      const box = await computeAlphaBox(buffer);
      if (!box) return buffer;
      const centerX = box.minX + (box.maxX - box.minX + 1) / 2;
      return shiftCell(buffer, Math.round(targetCenterX - centerX), 0);
    })
  );
}

async function normalizeFrameBottomY(frames, targetBottomY) {
  return Promise.all(
    frames.map(async (buffer) => {
      const box = await computeAlphaBox(buffer);
      if (!box) return buffer;
      return shiftCell(buffer, 0, Math.round(targetBottomY - box.maxY));
    })
  );
}

async function normalizeFrameCenterY(frames, targetCenterY) {
  return Promise.all(
    frames.map(async (buffer) => {
      const box = await computeAlphaBox(buffer);
      if (!box) return buffer;
      const centerY = box.minY + (box.maxY - box.minY + 1) / 2;
      return shiftCell(buffer, 0, Math.round(targetCenterY - centerY));
    })
  );
}

async function shiftCell(buffer, dx, dy) {
  if (dx === 0 && dy === 0) return buffer;
  const left = Math.max(0, dx);
  const top = Math.max(0, dy);
  const extractLeft = Math.max(0, -dx);
  const extractTop = Math.max(0, -dy);
  const width = CELL_WIDTH - Math.abs(dx);
  const height = CELL_HEIGHT - Math.abs(dy);
  const shiftedInput = await sharp(buffer)
    .extract({ left: extractLeft, top: extractTop, width, height })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite([{ input: shiftedInput, left, top }])
    .png()
    .toBuffer();
}

async function computeAlphaBox(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= 24) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

async function buildMotionFrames(processed) {
  const referenceFrames = await buildReferenceSheetFrames();
  const motionFrames = new Map();
  for (const rowDef of ROW_DEFINITIONS) {
    const stateDir = path.join(motionDir, rowDef.state);
    await mkdir(stateDir, { recursive: true });
    const frames = [];
    for (let column = 0; column < COLUMNS; column += 1) {
      const frame = {
        scarfPolicy: rowDef.scarfPolicy ?? "keep-original",
        transitionSafe: rowDef.transitionSafe === true,
        ...rowDef.frames[column]
      };
      if (!frame) {
        throw new Error(`Missing V${PET_VERSION} frame ${column} for state "${rowDef.state}".`);
      }
      let buffer;
      if (frame.src === "reference-sheet") {
        const sheetFrames = referenceFrames.get(frame.sheet);
        if (!sheetFrames || !sheetFrames[frame.index]) {
          throw new Error(`No reference frame ${frame.index} found for sheet "${frame.sheet}".`);
        }
        buffer = sheetFrames[frame.index];
        if (frame.x || frame.y) {
          buffer = await shiftCell(buffer, frame.x ?? 0, frame.y ?? 0);
        }
        if (frame.clearBelow) {
          buffer = await clearBelow(buffer, frame.clearBelow);
        }
      } else {
        const sourcePath = processed.get(frame.src);
        if (!sourcePath) {
          throw new Error(`No processed source found for frame "${frame.src}".`);
        }
        buffer = await renderFrame(sourcePath, frame);
      }
      const outputPath = path.join(stateDir, `frame-${String(column).padStart(2, "0")}.png`);
      await writeFile(outputPath, buffer);
      frames.push({ buffer, src: frame.src, path: outputPath });
    }
    motionFrames.set(rowDef.state, frames);
  }
  return motionFrames;
}

async function clearBelow(buffer, yStart) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.from(data);
  for (let y = yStart; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      rgba[(y * info.width + x) * info.channels + 3] = 0;
    }
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

async function renderFrame(sourcePath, frame) {
  const scale = frame.scale ?? 1;
  const width = Math.max(1, Math.round(CELL_WIDTH * scale * (frame.scaleX ?? 1)));
  const height = Math.max(1, Math.round(CELL_HEIGHT * scale * (frame.scaleY ?? 1)));
  let image = sharp(sourcePath).resize(width, height, {
    fit: "contain",
    background: TRANSPARENT,
    kernel: "lanczos3"
  });
  if (frame.flip) image = image.flop();
  if (frame.rotate) image = image.rotate(frame.rotate, { background: TRANSPARENT });

  let transformed = await image.png().toBuffer();
  let metadata = await sharp(transformed).metadata();
  if (metadata.width > CELL_WIDTH || metadata.height > CELL_HEIGHT) {
    transformed = await sharp(transformed)
      .resize(CELL_WIDTH, CELL_HEIGHT, {
        fit: "contain",
        background: TRANSPARENT,
        kernel: "lanczos3"
      })
      .png()
      .toBuffer();
    metadata = await sharp(transformed).metadata();
  }
  const left = clamp(
    Math.round((CELL_WIDTH - metadata.width) / 2 + (frame.x ?? 0)),
    0,
    CELL_WIDTH - metadata.width
  );
  const top = clamp(
    Math.round((CELL_HEIGHT - metadata.height) / 2 + (frame.y ?? 0)),
    0,
    CELL_HEIGHT - metadata.height
  );

  const composites = [];
  if (frame.shadow !== false) {
    composites.push({ input: await makeShadowOverlay(frame), left: 0, top: 0 });
  }
  composites.push({ input: transformed, left, top });

  let rendered = await sharp({
    create: {
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite(composites)
    .png()
    .toBuffer();

  if (frame.blink) rendered = await addBlinkOverlay(rendered);
  return rendered;
}

async function makeShadowOverlay(frame) {
  const jumpLift = Math.max(0, -1 * (frame.y ?? 0));
  const scale = clamp((frame.shadowScale ?? 1) - jumpLift / 90, 0.62, 1.08);
  const opacity = clamp((frame.shadowOpacity ?? 0.22) - jumpLift / 160, 0.1, 0.24);
  const width = Math.round(96 * scale);
  const height = Math.round(16 * scale);
  const cx = clamp(96 + Math.round((frame.x ?? 0) * 0.45), 48, 144);
  const cy = 184;
  const svg = `
    <svg width="${CELL_WIDTH}" height="${CELL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}"
        fill="#111827" opacity="${opacity.toFixed(3)}"/>
    </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function addBlinkOverlay(frameBuffer) {
  const svg = `
    <svg width="${CELL_WIDTH}" height="${CELL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <path d="M67 74 Q76 80 85 74" fill="none" stroke="#171312" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M108 74 Q117 80 126 74" fill="none" stroke="#171312" stroke-width="3.2" stroke-linecap="round"/>
    </svg>`;
  return sharp(frameBuffer)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toBuffer();
}

async function buildSpritesheet(motionFrames) {
  const composites = [];
  for (const rowDef of ROW_DEFINITIONS) {
    const frames = motionFrames.get(rowDef.state);
    for (let column = 0; column < COLUMNS; column += 1) {
      composites.push({
        input: frames[column].buffer,
        left: column * CELL_WIDTH,
        top: rowDef.row * CELL_HEIGHT
      });
    }
  }

  return sharp({
    create: {
      width: SPRITESHEET_WIDTH,
      height: SPRITESHEET_HEIGHT,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite(composites)
    .png()
    .toBuffer();
}

async function buildAnimatedPreviews(motionFrames) {
  for (const rowDef of ROW_DEFINITIONS) {
    const usedFrames = motionFrames
      .get(rowDef.state)
      .slice(0, rowDef.frames.length)
      .map((frame) => frame.buffer);
    await writeAnimatedWebP(
      usedFrames,
      Array.from({ length: usedFrames.length }, () => rowDef.delay),
      path.join(previewDir, `${String(rowDef.row).padStart(2, "0")}-${rowDef.state}.webp`)
    );
  }
}

async function writeAnimatedWebP(frames, delays, outputPath) {
  const composites = frames.map((input, index) => ({
    input,
    left: 0,
    top: index * CELL_HEIGHT
  }));
  await sharp({
    create: {
      width: CELL_WIDTH,
      height: CELL_HEIGHT * frames.length,
      channels: 4,
      background: TRANSPARENT,
      pageHeight: CELL_HEIGHT
    }
  })
    .composite(composites)
    .webp({
      loop: 0,
      delay: delays
    })
    .toFile(outputPath);
}

async function buildPreviewContactSheet(spritesheet) {
  const labelWidth = 230;
  const gutter = 24;
  const topMargin = 92;
  const width = labelWidth + gutter + SPRITESHEET_WIDTH + 40;
  const height = topMargin + SPRITESHEET_HEIGHT + 40;
  const sheetLeft = labelWidth + gutter;
  const sheetTop = topMargin;
  const labels = ROW_DEFINITIONS.map(
    (row) =>
      `<text x="24" y="${sheetTop + row.row * CELL_HEIGHT + 42}" class="state">${escapeXml(
        row.state
      )}</text><text x="24" y="${sheetTop + row.row * CELL_HEIGHT + 70}" class="note">${escapeXml(
        row.note
      )}</text><text x="24" y="${sheetTop + row.row * CELL_HEIGHT + 90}" class="policy">${escapeXml(
        `${row.family}; ${row.scarfPolicy}`
      )}</text>`
  ).join("");
  const verticalLines = Array.from({ length: COLUMNS + 1 }, (_, i) => {
    const x = sheetLeft + i * CELL_WIDTH;
    return `<line x1="${x}" y1="${sheetTop}" x2="${x}" y2="${
      sheetTop + SPRITESHEET_HEIGHT
    }" class="grid"/>`;
  }).join("");
  const horizontalLines = Array.from({ length: ROWS + 1 }, (_, i) => {
    const y = sheetTop + i * CELL_HEIGHT;
    return `<line x1="${sheetLeft}" y1="${y}" x2="${
      sheetLeft + SPRITESHEET_WIDTH
    }" y2="${y}" class="grid"/>`;
  }).join("");
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checker" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#f8fafc"/>
          <rect width="12" height="12" fill="#e2e8f0"/>
          <rect x="12" y="12" width="12" height="12" fill="#e2e8f0"/>
        </pattern>
        <style>
          .title { font: 700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #111827; }
          .subtitle { font: 400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #4b5563; }
          .state { font: 700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #2d145f; }
          .note { font: 400 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #6b7280; }
          .policy { font: 400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #7c8798; }
          .grid { stroke: #7c3aed; stroke-width: 1; stroke-opacity: 0.28; }
        </style>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="24" y="38" class="title">Dubs Buddy Codex Pet Spritesheet</text>
      <text x="24" y="64" class="subtitle">V3.1 personality motion pack: refreshed idle, greeting, waiting, working, failed, and review</text>
      <rect x="${sheetLeft}" y="${sheetTop}" width="${SPRITESHEET_WIDTH}" height="${SPRITESHEET_HEIGHT}" fill="url(#checker)"/>
      ${labels}
      ${verticalLines}
      ${horizontalLines}
    </svg>`;

  await sharp(Buffer.from(svg))
    .composite([{ input: spritesheet, left: sheetLeft, top: sheetTop }])
    .png()
    .toFile(path.join(ROOT, "dist", "preview-contact-sheet.png"));
}

async function buildGallery() {
  const cards = ROW_DEFINITIONS.map((row) => {
    const imageName = `${String(row.row).padStart(2, "0")}-${row.state}.webp`;
    const isCore = row.family.startsWith("core ");
    return `
      <article class="card ${isCore ? "core" : "alias"}">
        <div class="meta">
          <span class="row">Row ${row.row} · ${isCore ? "Core" : "Alias"}</span>
          <h2>${escapeHtml(row.state)}</h2>
          <p>${escapeHtml(row.note)}</p>
          <p class="detail">${escapeHtml(row.family)} · ${escapeHtml(row.scarfPolicy)}</p>
        </div>
        <div class="stage">
          <img src="./previews/${imageName}" alt="${escapeHtml(row.state)} 8-frame animation preview" />
        </div>
      </article>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dubs Buddy V3.1 Motion Gallery</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #111827;
      --muted: #586174;
      --line: #d8dee8;
      --purple: #4b2e83;
      --gold: #b7a57a;
      --paper: #ffffff;
      --wash: #f7f8fb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--wash);
      color: var(--ink);
      font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    header {
      padding: 28px clamp(20px, 5vw, 48px) 18px;
      border-bottom: 1px solid var(--line);
      background: var(--paper);
    }
    h1 { margin: 0 0 6px; font-size: clamp(28px, 4vw, 42px); letter-spacing: 0; }
    header p { margin: 0; color: var(--muted); max-width: 820px; }
    main {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
      padding: 22px clamp(20px, 5vw, 48px) 40px;
    }
    .card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 132px;
      gap: 16px;
      align-items: center;
      min-height: 178px;
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--paper);
    }
    .card.core { border-left: 5px solid var(--purple); }
    .card.alias { border-left: 5px solid var(--gold); }
    .row {
      display: inline-flex;
      margin-bottom: 8px;
      color: var(--purple);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
    }
    h2 { margin: 0 0 8px; font-size: 20px; letter-spacing: 0; }
    .meta p { margin: 0; color: var(--muted); }
    .meta .detail { margin-top: 8px; font-size: 12px; color: #7c8798; }
    .stage {
      display: grid;
      place-items: center;
      width: 132px;
      height: 144px;
      border-radius: 8px;
      background:
        linear-gradient(45deg, #edf1f5 25%, transparent 25%),
        linear-gradient(-45deg, #edf1f5 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #edf1f5 75%),
        linear-gradient(-45deg, transparent 75%, #edf1f5 75%);
      background-color: #fff;
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0;
      overflow: hidden;
    }
    img {
      width: 120px;
      height: 130px;
      object-fit: contain;
      image-rendering: auto;
    }
    @media (max-width: 520px) {
      .card { grid-template-columns: 1fr; }
      .stage { width: 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Dubs Buddy V3.1 Motion Gallery</h1>
    <p>V3.1 keeps the native Codex format and refreshes the most visible companion states with user-generated Dubs-style reference sheets.</p>
  </header>
  <main>
${cards}
  </main>
</body>
</html>
`;
  await writeFile(path.join(ROOT, "dist", "gallery.html"), html);
}

async function buildTransitionGallery(motionFrames) {
  const cards = [];
  for (const [from, to, label] of CORE_TRANSITIONS) {
    const fromFrames = motionFrames.get(from).slice(4, 8).map((frame) => frame.buffer);
    const toFrames = motionFrames.get(to).slice(0, 8).map((frame) => frame.buffer);
    const frames = [...fromFrames, ...toFrames];
    const delays = [
      130,
      130,
      150,
      220,
      220,
      150,
      130,
      130,
      130,
      130,
      150,
      260
    ];
    const fileName = `${from}-to-${to}.webp`;
    await writeAnimatedWebP(frames, delays, path.join(transitionDir, fileName));
    cards.push({ from, to, label, fileName });
  }

  const cardHtml = cards.map((card) => `
    <article class="card">
      <div>
        <span>${escapeHtml(card.from)} -> ${escapeHtml(card.to)}</span>
        <h2>${escapeHtml(card.label)}</h2>
      </div>
      <div class="stage">
        <img src="./transitions/${card.fileName}" alt="${escapeHtml(card.label)} transition preview" />
      </div>
    </article>`).join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dubs Buddy V3.1 Transition Gallery</title>
  <style>
    :root { --ink: #111827; --muted: #586174; --line: #d8dee8; --purple: #4b2e83; --paper: #ffffff; --wash: #f7f8fb; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--wash); color: var(--ink); font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { padding: 28px clamp(20px, 5vw, 48px) 18px; border-bottom: 1px solid var(--line); background: var(--paper); }
    h1 { margin: 0 0 6px; font-size: clamp(28px, 4vw, 42px); letter-spacing: 0; }
    header p { margin: 0; color: var(--muted); max-width: 820px; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; padding: 22px clamp(20px, 5vw, 48px) 40px; }
    .card { display: grid; grid-template-columns: minmax(0, 1fr) 132px; gap: 16px; align-items: center; min-height: 168px; padding: 16px; border: 1px solid var(--line); border-left: 5px solid var(--purple); border-radius: 8px; background: var(--paper); }
    span { display: inline-block; margin-bottom: 8px; color: var(--purple); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    h2 { margin: 0; font-size: 20px; letter-spacing: 0; }
    .stage { display: grid; place-items: center; width: 132px; height: 144px; border-radius: 8px; background: #fff; overflow: hidden; }
    img { width: 120px; height: 130px; object-fit: contain; }
    @media (max-width: 520px) { .card { grid-template-columns: 1fr; } .stage { width: 100%; } }
  </style>
</head>
<body>
  <header>
    <h1>Dubs Buddy V3.1 Transition Gallery</h1>
    <p>These previews stitch the end of one core state into the beginning of another so transition jumps are easy to spot before installing.</p>
  </header>
  <main>
${cardHtml}
  </main>
</body>
</html>
`;
  await writeFile(path.join(ROOT, "dist", "transition-gallery.html"), html);
}

async function buildDemoPreview(motionFrames) {
  const demoStates = [
    "idle",
    "running-right",
    "running-left",
    "jumping",
    "waiting",
    "running",
    "review",
    "idle",
    "running",
    "failed",
    "idle"
  ];
  const frames = [];
  const delays = [];
  for (const state of demoStates) {
    const rowDef = ROW_DEFINITIONS.find((row) => row.state === state);
    for (const frame of motionFrames.get(state)) {
      frames.push(frame.buffer);
      delays.push(rowDef.delay);
    }
    delays[delays.length - 1] = 360;
  }
  await writeAnimatedWebP(
    frames,
    delays,
    path.join(demoDir, `dubs-buddy-v${PET_VERSION}-demo.webp`)
  );
}

async function buildReleasePreview() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dubs Buddy V3.1 Release Preview</title>
  <style>
    :root { --ink: #111827; --muted: #586174; --line: #d8dee8; --purple: #4b2e83; --gold: #b7a57a; --paper: #fff; --wash: #f7f8fb; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--wash); color: var(--ink); font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { padding: 28px clamp(20px, 5vw, 48px) 18px; border-bottom: 1px solid var(--line); background: var(--paper); }
    h1 { margin: 0 0 6px; font-size: clamp(28px, 4vw, 42px); letter-spacing: 0; }
    h2 { margin: 0 0 8px; font-size: 22px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); max-width: 860px; }
    main { display: grid; gap: 18px; padding: 22px clamp(20px, 5vw, 48px) 40px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
    .card { padding: 16px; border: 1px solid var(--line); border-left: 5px solid var(--purple); border-radius: 8px; background: var(--paper); }
    .card.gold { border-left-color: var(--gold); }
    .stage { display: grid; place-items: center; min-height: 260px; margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; overflow: auto; }
    img { max-width: 100%; height: auto; image-rendering: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <header>
    <h1>Dubs Buddy V3.1 Release Preview</h1>
    <p>Use this page to inspect the current V3.1 build target before installing or publishing.</p>
  </header>
  <main>
    <section class="grid">
      <article class="card">
        <h2>V3.1 Release Build</h2>
        <p>Current build target: <code>${DIST_PACKAGE_NAME}</code>. Install with <code>npm run install:pet</code>.</p>
        <div class="stage"><img src="./${DIST_PACKAGE_NAME}/spritesheet.png" alt="V3.1 current spritesheet" /></div>
      </article>
      <article class="card gold">
        <h2>Release Package</h2>
        <p>Run <code>npm run package:zip</code> to create <code>release/uw-dubs-codex-pet-v${PET_VERSION}.zip</code> for GitHub Releases.</p>
        <div class="stage"><img src="./demo/dubs-buddy-v${PET_VERSION}-demo.webp" alt="Dubs Buddy V3.1 demo animation" /></div>
      </article>
    </section>
    <section class="card">
      <h2>Motion QA</h2>
      <p>Open <code>gallery.html</code>, <code>transition-gallery.html</code>, and <code>demo/dubs-buddy-v${PET_VERSION}-demo.webp</code> for focused motion checks.</p>
      <div class="stage"><img src="./preview-contact-sheet.png" alt="V3.1 contact sheet" /></div>
    </section>
  </main>
</body>
</html>
`;
  await writeFile(path.join(ROOT, "dist", "release-preview.html"), html);
}

function renderStateMappingMarkdown() {
  const rows = ROW_DEFINITIONS.map((row) => {
    const frames = row.frames
      .map((frame, index) => {
        const src = frame.src === "reference-sheet" ? `${frame.sheet}[${frame.index}]` : frame.src;
        return `\`frame-${String(index).padStart(2, "0")}.png:${src}\``;
      })
      .join(", ");
    return `| ${row.row} | \`${row.state}\` | ${row.family} | ${row.scarfPolicy} | ${row.transitionSafe ? "yes" : "alias"} | ${frames} | ${row.note} |`;
  }).join("\n");
  return `# Dubs Buddy State Mapping

Codex Desktop currently renders custom pets from a fixed 8 x 9 spritesheet. Each cell is 192 x 208 px, and the complete image is 1536 x 1872 px.

V3.1 uses the curated reference sheets in \`references/source-sheets/\`. It does not add a second W logo; front-facing frames keep the source artwork's scarf mark, while side-running rows use no-logo side views so there is no reversed W or purple cover patch.

| Row | Codex state | Motion family | Scarf policy | Transition-safe | V3.1 native frames | Role |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

function renderInstallText() {
  return `Dubs Buddy Codex Custom Pet

Install on macOS:
1. Copy this ${DIST_PACKAGE_NAME} folder to ~/.codex/pets/${DIST_PACKAGE_NAME}
2. Open Codex Desktop.
3. Go to Appearance -> Pets -> Custom pets.
4. Click Refresh, select ${PET_DISPLAY_NAME}, then click Wake Pet.

Install on Windows:
1. Copy this ${DIST_PACKAGE_NAME} folder to %USERPROFILE%\\.codex\\pets\\${DIST_PACKAGE_NAME}
2. Open Codex Desktop.
3. Go to Appearance -> Pets -> Custom pets.
4. Click Refresh, select ${PET_DISPLAY_NAME}, then click Wake Pet.

${PET_DISPLAY_NAME} version: ${PET_VERSION}

V3.1 personality motion pack refreshes idle, greeting, waiting, working, failed, and review while avoiding extra W overlays.

Dubs Buddy was created by a UW Foster master's student as a non-commercial Codex Desktop custom pet project. It is not affiliated with the University of Washington or OpenAI.
`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

await main();
