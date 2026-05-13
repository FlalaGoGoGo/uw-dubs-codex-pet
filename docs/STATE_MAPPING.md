# State Mapping

Codex Desktop currently loads custom pets from a fixed `8 x 9` spritesheet.

- Frame size: `192 x 208`
- Sheet size: `1536 x 1872`
- Columns: `8`
- Rows: `9`

## Rows

| Row | Codex state | Dubs Buddy role | Notes |
| --- | --- | --- | --- |
| 0 | `idle` | Sitting companion | Breathing, blink, ears, and tail movement. |
| 1 | `running-right` | Right-facing side run | No visible W on the side scarf, avoiding reversed logo issues. |
| 2 | `running-left` | Left-facing side run | Mirrored from the no-logo side-running reference. |
| 3 | `waving` | Greeting | Friendly paw wave while staying visually close to idle. |
| 4 | `jumping` | Hover / attention | Crouch, jump, airborne, landing, and recovery. |
| 5 | `failed` | Error / blocked | Sad, droopy ears, crying expression, then recovery. |
| 6 | `waiting` | Waiting for user | Dubs watches an hourglass. |
| 7 | `running` | Codex working | Dubs types on a laptop. |
| 8 | `review` | Success / done | Dubs pops out of a gift box with a success cue. |

## Motion Principles

- Every row has eight effective frames.
- Current source sheets live in `references/source-sheets/`.
- Front-facing rows keep the original scarf W from the artwork. The build does not add a second W overlay.
- Side-facing rows do not show the W, which avoids mirrored or covered-logo artifacts.
- Common loops are aligned to reduce visual jumps between Codex states.
- `npm run verify` checks transparent corners, frame size, row drift, nonblank cells, duplicate frames, and tiny isolated alpha specks.

## QA Outputs

After `npm run build`, inspect:

- `dist/preview-contact-sheet.png`
- `dist/gallery.html`
- `dist/transition-gallery.html`
- `dist/demo/dubs-buddy-v3.1.0-demo.webp`
- `dist/previews/*.webp`
