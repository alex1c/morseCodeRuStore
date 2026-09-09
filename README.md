# Тренажёр азбуки Морзе

Android-first обучающий тренажёр азбуки Морзе (ForestMusic / RuStore).

## Phase 1–2

- Phase 1: identity, navigation, theme, AsyncStorage, onboarding, Home
- Phase 2: Morse Engine (catalog, encode/decode, timing, Farnsworth, timeline, audio boundary)

See `docs/morse-reference.md` for contested Russian letters and timing math.

## Scripts

```bash
npm start
npm test
npm run typecheck
npm run lint
```

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict
- React Navigation
- AsyncStorage
- expo-av (procedural WAV tones)
- Jest / ESLint

## Package

`com.calculatorplatform.morsecodetrainer`
