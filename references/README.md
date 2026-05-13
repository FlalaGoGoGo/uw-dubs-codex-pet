# Reference Assets

This folder contains the source artwork used by the build pipeline.

## Layout

- `style/Dubs.png`: the visual style anchor for the project.
- `source-sheets/*.png`: current 4 x 2 animation sheets, with eight frames per state.

## Sheet Format

Each animation sheet should contain eight frames:

```text
frame 00  frame 01  frame 02  frame 03
frame 04  frame 05  frame 06  frame 07
```

Keep each frame visually centered, leave generous spacing between frames, and use a transparent background when possible. The build will crop and normalize frames into Codex's required `192 x 208` cells.

## Naming

Use stable state-oriented names instead of version folders:

- `idle.png`
- `running-right.png`
- `jumping.png`
- `waving.png`
- `failed-sad-crying.png`
- `waiting-hourglass.png`
- `running-working.png`
- `review-success-gift-box.png`

Generated frames and final spritesheets are not stored here; they are created under ignored build folders.
