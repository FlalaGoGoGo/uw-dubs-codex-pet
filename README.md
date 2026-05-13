# Dubs Buddy Codex Pet

An unofficial UW-inspired custom pet for Codex Desktop.

Dubs Buddy is a native Codex custom pet, not a standalone desktop app. It installs through `Appearance -> Pets -> Custom pets` and uses Codex's fixed spritesheet format: `8 x 9` frames, `192 x 208` pixels per frame, `1536 x 1872` pixels total.

![Dubs Buddy demo](docs/media/dubs-buddy-demo.webp)

## Install From Release Zip

1. Download `dubs-buddy-codex-pet-v3.1.0.zip` from the [latest release](https://github.com/FlalaGoGoGo/dubs-buddy-codex-pet/releases/latest).
2. Unzip it. You should see a folder named `dubs-buddy`.
3. Copy that folder into your Codex custom pets directory.

macOS:

```bash
mkdir -p ~/.codex/pets
cp -R dubs-buddy ~/.codex/pets/dubs-buddy
```

Windows PowerShell:

```powershell
$petDir = "$env:USERPROFILE\.codex\pets"
New-Item -ItemType Directory -Force $petDir | Out-Null
Copy-Item -Recurse -Force ".\dubs-buddy" "$petDir\dubs-buddy"
```

Then open Codex Desktop:

```text
Appearance -> Pets -> Custom pets -> Refresh -> Dubs Buddy -> Wake Pet
```

## Build From Source

```bash
git clone https://github.com/FlalaGoGoGo/dubs-buddy-codex-pet.git
cd dubs-buddy-codex-pet
npm install
npm run build
npm run verify
npm run install:pet
```

After installing, refresh the custom pet list in Codex and select `Dubs Buddy`.

## What Is Included

- `dist/dubs-buddy/`: generated Codex pet package after `npm run build`
- `release/dubs-buddy-codex-pet-v3.1.0.zip`: generated release zip after `npm run package:zip`
- `v3_1_references/`: V3.1 reference sheets for idle, waving, failed, waiting, running, and review
- `v2_8_references/`: side-running and jumping reference sheets still used by the current build
- `scripts/`: build, verify, install, status, and packaging scripts
- `docs/`: installation, state mapping, development, publishing, and Word setup guide materials

## Commands

```bash
npm run build           # generate dist/dubs-buddy and QA previews
npm run verify          # validate manifest, spritesheet, frame drift, previews, and transparency
npm run status:pet      # compare dist/dubs-buddy with the installed Codex pet
npm run install:pet     # copy dist/dubs-buddy to ~/.codex/pets/dubs-buddy
npm run package:zip     # create release/dubs-buddy-codex-pet-v3.1.0.zip
npm run prepare:release # build, verify, and package
```

## Codex State Mapping

| Row | Codex state | Dubs Buddy animation |
| --- | --- | --- |
| 0 | `idle` | Sitting, breathing, blinking |
| 1 | `running-right` | Right-facing side run |
| 2 | `running-left` | Left-facing side run |
| 3 | `waving` | Friendly paw wave |
| 4 | `jumping` | Real jump / hover attention |
| 5 | `failed` | Sad and crying |
| 6 | `waiting` | Watching an hourglass |
| 7 | `running` | Typing on a laptop |
| 8 | `review` | Happy gift-box success |

More detail: [docs/STATE_MAPPING.md](docs/STATE_MAPPING.md)

## Troubleshooting

- If Dubs Buddy does not appear, confirm the folder is exactly `~/.codex/pets/dubs-buddy` on macOS or `%USERPROFILE%\.codex\pets\dubs-buddy` on Windows.
- If Codex was already open, click `Refresh` in `Appearance -> Pets -> Custom pets`, or restart Codex.
- If the pet appears with a white box or bad cropping, run `npm run build && npm run verify` and check `dist/preview-contact-sheet.png`.
- If the installed version looks old, run `npm run status:pet`, then reinstall with `npm run install:pet`.

## Documentation

- [Install guide](docs/INSTALL.md)
- [State mapping](docs/STATE_MAPPING.md)
- [Development notes](docs/DEVELOPMENT.md)
- [Publishing notes](docs/PUBLISHING.md)
- [Word setup guide](docs/Dubs_Buddy_Setup_Guide.docx)

## Unofficial Fan Project

Dubs Buddy is a non-commercial, unofficial fan project. It is not affiliated with, endorsed by, or sponsored by the University of Washington or OpenAI.

UW names, colors, logos, mascot references, and the Block W may involve University trademark rules. Review the official UW resources before broad distribution or any commercial use:

- [UW Trademarks & Licensing](https://www.washington.edu/trademarks/)
- [UW Brand Trademarks & Licensing](https://www.washington.edu/brand/marketing-resources/trademarks-licensing/)
