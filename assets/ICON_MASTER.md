# Master icon pipeline — Морзе-тренер

## Target concept

- Morse rhythm: `• —`
- Modern educational look
- No text inside the icon
- Readable at small launcher sizes
- Not a military emblem

## Paths

| Role | Path |
|------|------|
| Master source (drop here) | `assets/icon_gpt.png` |
| Expo / launcher source | `assets/icon.png` (synced from master when ready) |
| Adaptive foreground / background | `assets/android-icon-*.png` |
| RuStore 512×512 | `release-artifacts/icon-512.png` |

## Status (Phase 12A)

**MASTER ICON REQUIRED**

Current `assets/icon.png` is the Expo template (not an approved Morse product icon).
Do not invent final art via third-party generators in automation.

When `assets/icon_gpt.png` is provided by the designer/owner:

```bash
node scripts/prepare-release-icons.cjs
```

This validates the master, writes `release-artifacts/icon-512.png` (exact 512×512),
and documents remaining Expo asset sync steps.
