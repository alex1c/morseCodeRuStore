# Notes for Phase 12B — local production signing

Repository: `https://github.com/alex1c/morseCodeRuStore`  
Branch: `main`  
Phase 12A prepares release assets; **do not** create keystores in this repo.

## App identity

- Name: `Морзе-тренер`
- Package: `com.calculatorplatform.morsecodetrainer`
- Version: `1.0.0` / versionCode `1`

## Before signing

1. Publish privacy HTML to `https://forest-music.ru/privacy/morse-trainer` (source: `release-artifacts/privacy/morse-trainer.html`).
2. Master icon is already applied (`assets/icon_gpt.png` → launcher / adaptive / `release-artifacts/icon-512.png`).
3. Capture screenshots on `ForestMusic_Fast_API35`, crop to 1080×1920, run `npm run validate:screenshots`.

## Signing (local only)

- Create production keystore **only on the local machine**, outside git.
- Never commit `.jks` / `.keystore` / passwords / `keystore.properties`.
- Build production signed AAB locally after icons/screenshots/privacy are ready.
- Optional: store AAB checksums under `release-artifacts/checksums/`.
