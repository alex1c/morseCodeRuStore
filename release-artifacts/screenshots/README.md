# Screenshots — Морзе-тренер (RuStore)

## Required size

Every final file must be exactly **1080×1920** (9:16 portrait).

Do **not** use 1080×2400 or raw emulator resolution as the store asset.

## Expected files

| File | Screen |
|------|--------|
| `01-home.png` | Главный экран |
| `02-learning.png` | Пошаговый урок |
| `03-visual-morse.png` | Визуальная азбука / мнемоника |
| `04-receive.png` | Приём на слух |
| `05-transmit.png` | Передача / ключ |
| `06-words.png` | Слова и фразы |
| `07-adaptive.png` | Мои ошибки / умная тренировка |
| `08-stats.png` | Статистика |

Minimum: **6** high-quality shots from the table above.

## Capture rules

- Real UI only; no Metro, debug menus, permission dialogs, test ads, or system error banners
- Prefer states without a visually dominant banner
- AVD: `ForestMusic_Fast_API35` only for intermediate capture (not Pixel_10)
- After capture, crop/letterbox to **1080×1920**, then run:

```bash
node scripts/validate-screenshots.cjs
```

## Status (Phase 12A)

`SCREENSHOTS CAPTURE PENDING` — Fast AVD was not online for capture in this session.
