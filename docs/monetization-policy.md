# Monetization policy — Морзе-тренер

Product rules for ads (Phase 11). Learning remains fully free.

## Banners

- Show only on **calm** screens: Home, Course, Stats, Translator, Reference, Learning, Settings, Errors.
- Place at the **bottom** of the screen, after primary content.
- **No banners** during active training: Lesson, ReceiveSession, TransmitSession, Daily flow, result screens.
- Prefer **no banners** on Receive/Transmit setup if the layout is cramped.
- Banner load failure collapses quietly — no empty hole, no error UI.

## Interstitial

- Max **1 show per app process** (in-memory session cap).
- Only after a completed meaningful training session, when the user taps **Home** from a result screen.
- Requires: onboarding completed, at least **2** meaningful sessions in history, ad ready, ads enabled, training not active.
- **Exclude** first lesson / first training via the minimum session count.
- **Exclude** Daily first-completion Home path (`isDailyFirstCompletionToday`) — DailyResult Home always passes this exclusion.
- Navigation to Home is **never** blocked by ad load/show failure.

## Not used

- **No rewarded** ads.
- **No paywall**.
- Reserve banner units and rewarded unit IDs are documented but **not** wired into runtime getters.
- Full learning course remains free.
