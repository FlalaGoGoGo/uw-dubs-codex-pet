# Install Dubs Buddy

Dubs Buddy is installed as a Codex native custom pet. You do not need Electron, Tauri, or a separate desktop pet app.

## Option 1: Release Zip

1. Download `uw-dubs-codex-pet-v3.1.0.zip` from the [latest GitHub release](https://github.com/FlalaGoGoGo/uw-dubs-codex-pet/releases/latest).
2. Unzip it.
3. Copy the extracted `dubs-buddy` folder into the Codex custom pets directory.

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

## Option 2: Build From Source

```bash
git clone https://github.com/FlalaGoGoGo/uw-dubs-codex-pet.git
cd uw-dubs-codex-pet
npm install
npm run build
npm run verify
npm run install:pet
```

## Enable In Codex

1. Open Codex Desktop.
2. Open `Appearance`.
3. Go to `Pets`.
4. Open `Custom pets`.
5. Click `Refresh`.
6. Select `Dubs Buddy`.
7. Click `Wake Pet`.

## Confirm The Install

```bash
npm run status:pet
```

The installed pet should report:

- version: `3.1.0`
- pet id: `dubs-buddy`
- spritesheet: `1536x1872 png OK`

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Dubs Buddy does not appear | Check the folder path, then click `Refresh` in Codex. |
| Codex says the custom pet is invalid | Run `npm run verify`; the spritesheet must be `1536 x 1872`. |
| Pet appears with a white square | Rebuild with `npm run build`; the generated PNG should have transparent corners. |
| Installed version looks old | Run `npm run status:pet`, then reinstall with `npm run install:pet`. |
| Windows path confusion | Use `%USERPROFILE%\.codex\pets\dubs-buddy`, not the repo folder itself. |
