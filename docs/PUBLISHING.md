# Publishing Notes

## GitHub Release Checklist

1. Run the release build:

```bash
npm run prepare:release
```

2. Inspect the QA outputs:

```text
dist/preview-contact-sheet.png
dist/gallery.html
dist/transition-gallery.html
dist/demo/dubs-buddy-v3.1.0-demo.webp
```

3. Create a GitHub release using:

```text
release/uw-dubs-codex-pet-v3.1.0.zip
```

Suggested release title:

```text
Dubs Buddy v3.1.0
```

Suggested release notes:

```markdown
## Dubs Buddy v3.1.0

This release packages Dubs Buddy as a Codex native custom pet.

Highlights:
- eight-frame native Codex spritesheet rows
- side-running left and right animations
- jumping, waving, waiting, working, failed, and review states
- transparent background cleanup and frame-alignment QA
- installable release zip for macOS and Windows

Install:
1. Download `uw-dubs-codex-pet-v3.1.0.zip`.
2. Unzip it.
3. Copy `dubs-buddy` to your Codex custom pets folder.
4. In Codex Desktop, go to `Appearance -> Pets -> Custom pets -> Refresh -> Dubs Buddy -> Wake Pet`.
```

## LinkedIn Draft

```text
I built Dubs Buddy, an unofficial UW-inspired custom pet for Codex Desktop.

It is a native Codex custom pet, so installation is simple: download the release zip, copy the `dubs-buddy` folder into Codex's custom pets directory, then enable it from Appearance -> Pets -> Custom pets.

The current version includes idle, side-running, waving, jumping, waiting, laptop-typing, sad failed, and gift-box success animations.

Repo: https://github.com/FlalaGoGoGo/uw-dubs-codex-pet

This is a non-commercial, unofficial fan project and is not affiliated with UW or OpenAI.

Go Dawgs, and may your tests pass.
```

## Disclaimer

Dubs Buddy is not affiliated with, endorsed by, or sponsored by the University of Washington or OpenAI.

Before broad distribution or commercial use, review:

- https://www.washington.edu/trademarks/
- https://www.washington.edu/brand/marketing-resources/trademarks-licensing/
