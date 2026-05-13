# Contributing

Thanks for helping improve Dubs Buddy.

## Local Setup

```bash
npm install
npm run build
npm run verify
```

## Artwork Contributions

- Keep the style close to `references/style/Dubs.png`.
- Add current source art under `references/source-sheets/`; avoid new version-numbered reference folders.
- Use a 4 x 2 sheet with eight frames.
- Keep frame spacing generous so adjacent frames do not enter the crop.
- Front-facing scarf artwork should not contain duplicated W marks.
- Side-facing running frames do not need to show the W.

## Pull Request Checklist

- Run `npm run prepare:release`.
- Inspect `dist/preview-contact-sheet.png`.
- Inspect `dist/gallery.html` and `dist/transition-gallery.html`.
- Confirm `npm run status:pet` after installing locally if you changed build output.
- Update README version history when the user-facing behavior changes.
