# Development Notes

## Source Assets

The current build is intentionally small:

- `Dubs.png`: original style reference
- `v3_1_references/`: V3.1 4 x 2 reference sheets for the main personality states
- `v2_8_references/`: side-running and jumping reference sheets still used by V3.1

Generated files are ignored by git:

- `v3_1_motion_sources/`
- `dist/`
- `release/`
- `assets/processed/`
- `docs/rendered/`

## Build Pipeline

```bash
npm install
npm run build
npm run verify
```

`npm run build`:

1. Reads the reference sheets.
2. Removes connected white/checkerboard backgrounds.
3. Slices each 4 x 2 sheet into eight frames.
4. Normalizes frame position, baseline, and transparency.
5. Generates the Codex spritesheet at `dist/dubs-buddy/spritesheet.png`.
6. Writes `pet.json`, `VERSION.txt`, install notes, contact sheet, galleries, transition previews, and demo WebP.

`npm run verify` validates:

- `pet.json` id and relative spritesheet path
- `VERSION.txt`
- PNG format, alpha channel, and `1536 x 1872` size
- eight nonblank and nonduplicate frames per row
- transparent corners
- transition endpoint drift
- tiny isolated alpha specks
- animated WebP previews and gallery files

## Reference Sheet Requirements

For new artwork, use an 8-frame 4 x 2 sheet:

- Four frames on the top row, four frames on the bottom row
- Consistent character size across frames
- Transparent background preferred
- If the generator adds a checkerboard/white background, the build tries to remove it
- Keep generous spacing between frames so neighboring elements do not enter the crop
- Keep Dubs in the same visual style as `Dubs.png`

## Release

```bash
npm run prepare:release
```

This runs:

1. `npm run build`
2. `npm run verify`
3. `npm run package:zip`

The release zip is generated at:

```text
release/dubs-buddy-codex-pet-v3.1.0.zip
```
