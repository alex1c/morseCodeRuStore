/**
 * International Morse timing + WPM + Farnsworth spacing.
 * Single source of truth — UI must not hardcode unit ratios.
 */

/** Canonical unit ratios (International Morse). */
export const TIMING_UNITS = {
	dot: 1,
	dash: 3,
	intraSymbolGap: 1,
	letterGap: 3,
	wordGap: 7,
} as const

/**
 * PARIS convention: unit duration in milliseconds.
 * unitMs = 1200 / WPM
 */
export function unitMsFromWpm (wpm: number): number {
	if (!(wpm > 0) || !Number.isFinite(wpm)) {
		throw new Error(`WPM must be a positive finite number, got ${wpm}`)
	}
	return 1200 / wpm
}

/**
 * Centralized duration rounding — avoids float drift across a long timeline.
 * All timeline event durations must go through this helper.
 */
export function durationMsFromUnits (
	units: number,
	unitMs: number,
	spacingMultiplier = 1,
): number {
	return Math.round(units * unitMs * spacingMultiplier)
}

export type TimingModel = {
	/** Speed of dots/dashes/intra-element gaps (character speed). */
	characterWpm: number
	/**
	 * Multiplier applied only to letter/word gaps (Farnsworth).
	 * 1 = standard International spacing.
	 */
	farnsworthMultiplier: number
	/** Base unit at character speed (may be fractional before rounding). */
	unitMs: number
	dotMs: number
	dashMs: number
	intraGapMs: number
	letterGapMs: number
	wordGapMs: number
}

export type CreateTimingModelInput = {
	characterWpm: number
	/** Defaults to 1. Must be >= 1 for slower spacing; values in (0,1) allowed but unusual. */
	farnsworthMultiplier?: number
}

/**
 * Build a timing model.
 * Farnsworth stretches letter/word gaps only — never dots, dashes, or intra gaps.
 */
export function createTimingModel (
	input: CreateTimingModelInput,
): TimingModel {
	const characterWpm = input.characterWpm
	const farnsworthMultiplier = input.farnsworthMultiplier ?? 1
	if (!(farnsworthMultiplier > 0) || !Number.isFinite(farnsworthMultiplier)) {
		throw new Error(
			`farnsworthMultiplier must be a positive finite number, got ${farnsworthMultiplier}`,
		)
	}
	const unitMs = unitMsFromWpm(characterWpm)
	return {
		characterWpm,
		farnsworthMultiplier,
		unitMs,
		dotMs: durationMsFromUnits(TIMING_UNITS.dot, unitMs),
		dashMs: durationMsFromUnits(TIMING_UNITS.dash, unitMs),
		intraGapMs: durationMsFromUnits(TIMING_UNITS.intraSymbolGap, unitMs),
		letterGapMs: durationMsFromUnits(
			TIMING_UNITS.letterGap,
			unitMs,
			farnsworthMultiplier,
		),
		wordGapMs: durationMsFromUnits(
			TIMING_UNITS.wordGap,
			unitMs,
			farnsworthMultiplier,
		),
	}
}

/**
 * Compatibility helper for Phase 1 preferences
 * (`targetWpm` + `farnsworthMultiplier`).
 */
export function createTimingModelFromPreferences (prefs: {
	targetWpm: number
	farnsworthMultiplier: number
}): TimingModel {
	return createTimingModel({
		characterWpm: prefs.targetWpm,
		farnsworthMultiplier: prefs.farnsworthMultiplier,
	})
}

/**
 * Optional future-facing API: derive a Farnsworth multiplier from
 * characterWpm + effectiveWpm (effective <= character).
 *
 * Uses a simplified gap scale: multiplier = characterWpm / effectiveWpm.
 * Documented in docs/morse-reference.md — not a full ARRL PARIS redistributor.
 */
export function farnsworthMultiplierFromSpeeds (
	characterWpm: number,
	effectiveWpm: number,
): number {
	if (!(characterWpm > 0) || !(effectiveWpm > 0)) {
		throw new Error('WPM values must be positive')
	}
	if (effectiveWpm > characterWpm) {
		return 1
	}
	return characterWpm / effectiveWpm
}
