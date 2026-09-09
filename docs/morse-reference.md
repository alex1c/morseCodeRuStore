# Morse reference (Phase 2)

Canonical source of codes: `src/domain/morse/catalog.ts`.

## Timing (International Morse)

| Element | Units |
| --- | ---: |
| dot | 1 |
| dash | 3 |
| intra-symbol gap | 1 |
| letter gap | 3 |
| word gap | 7 |

WPM (PARIS): `unitMs = 1200 / characterWpm`

Examples: 20 WPM → 60 ms, 15 → 80 ms, 12 → 100 ms, 10 → 120 ms.

All event durations use `Math.round(units * unitMs [* farnsworthMultiplier])`.

## Farnsworth

- Character speed (`characterWpm` / Phase 1 `targetWpm`) sets **dot, dash, and intra-element** timing.
- `farnsworthMultiplier` (Phase 1 preference, default `1.5`) scales **letter and word gaps only**.
- Dots/dashes are never stretched by Farnsworth.

Optional helper: `farnsworthMultiplierFromSpeeds(characterWpm, effectiveWpm) ≈ characterWpm / effectiveWpm` (simplified gap scale; not a full ARRL PARIS redistributor).

## Contested Russian letters

| Letter | Decision |
| --- | --- |
| **Ё** | Same code as **Е** (`.`). Encode accepts `Ё`; decode of `.` returns canonical **Е**. Listening practice corpus (Phase 7 words/phrases) normalizes to **Е** only — learners are not asked to guess orthography that Morse cannot encode separately. |
| **Ъ** | Code `--.--` (common modern Russian training tables). Classic telegraph sometimes omitted Ъ — we keep it for a 33-letter learner set. |
| **Ь** | Code `-..-` (same pattern as Latin **X**). Decode is alphabet-context sensitive. |

## Cross-alphabet collisions

Identical patterns can mean different letters in RU vs LATIN (e.g. `.-` → А / A, `-..-` → Ь / X).  
There is **no** global `code → character` map. Decode always requires a primary alphabet (`RU` or `LATIN`).

## Punctuation

Core set follows ITU-R M.1677-1 international marks listed in the catalog. Russian-only punctuation variants are out of scope for Phase 2.

## Visual mnemonics (Phase 3)

`visualMnemonicId` on `MorseSymbol` is a nullable hook. Mnemonics must reference the catalog symbol — they must not store a private Morse code copy.
