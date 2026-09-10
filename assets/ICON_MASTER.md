# Master icon pipeline — Морзе-тренер

## Source of truth

`assets/icon_gpt.png` — approved final product icon (do not redesign).

## Generated from master (`npm run prepare:icons`)

| Role | Path |
|------|------|
| Master | `assets/icon_gpt.png` |
| Expo launcher | `assets/icon.png` (1024×1024) |
| Adaptive foreground | `assets/android-icon-foreground.png` (safe-zone padding) |
| Adaptive background | `assets/android-icon-background.png` (solid navy) |
| Monochrome | `assets/android-icon-monochrome.png` |
| Favicon | `assets/favicon.png` |
| RuStore 512×512 | `release-artifacts/icon-512.png` |

Adaptive foreground uses technical padding only (content scaled ~72% and centered)
so the telegraph key and Morse elements stay inside the Android mask safe zone.
