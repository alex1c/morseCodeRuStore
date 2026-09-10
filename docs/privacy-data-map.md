# Privacy data map — Морзе-тренер

Inventory of data handled by the app (Phase 11). Keep this aligned with Settings privacy copy and the analytics allowlist.

## LOCAL

Stored on-device via AsyncStorage (or equivalent) unless noted:

- **preferences** — alphabet choice, theme, signal defaults (WPM / Farnsworth / tone), onboarding flag
- **learning progress** — course, unlocked/completed lessons, known symbols, best scores
- **SymbolStats** — per-symbol attempt aggregates for adaptive practice
- **transmit stats** — per-symbol transmit aggregates
- **Daily / streak** — completed local dates, last completion summary, streak counters
- **session history** — coarse session summaries (source, scores, duration) — not free-text answers
- **receive / transmit / tool settings** — last setup for practice and Translator/Reference playback
- **Translator text** — memory-only; not persisted
- **backup payload** — created/exported only when the user explicitly requests backup/restore

## EXTERNAL SDK

### Yandex Mobile Ads (РСЯ)

The Yandex Mobile Ads SDK may process technical and advertising-related data according to its own model (for example device/ad identifiers used by the SDK for ad delivery and measurement). Our app does not send Morse answers, translator text, or backup content to the ads SDK.

### AppMetrica

AppMetrica receives **technical / aggregated product analytics** through our typed event layer (semantic event names + coarse allowlisted enums/buckets only). Location tracking and advertising-identifier tracking are disabled in our activation options where the SDK allows.

## NEVER SENT BY OUR EVENT LAYER

Our `trackAnalyticsEvent` / sanitize layer must never emit:

- user answers (keyboard / choices / paper)
- Translator content or free-text Morse input
- Morse free text, custom sequences, or raw dot/dash traces
- backup file content, filename, or path
- weak letter lists
- specific confused symbol pairs
