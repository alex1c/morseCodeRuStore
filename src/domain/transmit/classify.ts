/**
 * Transmit key classification — WPM-based, not magic ms thresholds.
 *
 * unitMs = 1200 / WPM (PARIS)
 * nominal dot = 1 unit, dash = 3 units
 * classification threshold = 2 * unitMs (midpoint)
 *
 * Accidental taps below minTapMs are ignored (not recorded as elements).
 */

import { unitMsFromWpm } from '@/src/domain/morse'
import type { MorseElement } from '@/src/domain/morse'

export type PressQualityBucket =
	| 'good'
	| 'acceptable'
	| 'tooShort'
	| 'tooLong'

export type ClassifiedPress = {
	/** Null when the press is ignored as an accidental tap. */
	element: MorseElement | null
	durationMs: number
	unitMs: number
	nominalMs: number
	ratio: number
	quality: PressQualityBucket
	ignored: boolean
}

export type ClassificationModel = {
	characterWpm: number
	unitMs: number
	dotMs: number
	dashMs: number
	/** Duration >= this → dash; below → dot (after min tap check). */
	thresholdMs: number
	/** Presses shorter than this are ignored. */
	minTapMs: number
}

/**
 * Build classification thresholds for the active transmit WPM.
 */
export function createClassificationModel (
	characterWpm: number,
): ClassificationModel {
	const unitMs = unitMsFromWpm(characterWpm)
	const thresholdMs = 2 * unitMs
	const minTapMs = Math.max(30, 0.25 * unitMs)
	return {
		characterWpm,
		unitMs,
		dotMs: unitMs,
		dashMs: 3 * unitMs,
		thresholdMs,
		minTapMs,
	}
}

function qualityForRatio (ratio: number): PressQualityBucket {
	if (ratio >= 0.7 && ratio <= 1.3) {
		return 'good'
	}
	if (ratio >= 0.5 && ratio <= 1.6) {
		return 'acceptable'
	}
	return ratio < 1 ? 'tooShort' : 'tooLong'
}

/**
 * Classify a key-hold duration into dot/dash (or ignore).
 */
export function classifyKeyPress (
	durationMs: number,
	characterWpm: number,
): ClassifiedPress {
	const model = createClassificationModel(characterWpm)
	const safeDuration = Number.isFinite(durationMs)
		? Math.max(0, durationMs)
		: 0

	if (safeDuration < model.minTapMs) {
		return {
			element: null,
			durationMs: safeDuration,
			unitMs: model.unitMs,
			nominalMs: model.dotMs,
			ratio: safeDuration / model.dotMs,
			quality: 'tooShort',
			ignored: true,
		}
	}

	const element: MorseElement =
		safeDuration < model.thresholdMs ? 'dot' : 'dash'
	const nominalMs = element === 'dot' ? model.dotMs : model.dashMs
	const ratio = safeDuration / nominalMs
	return {
		element,
		durationMs: safeDuration,
		unitMs: model.unitMs,
		nominalMs,
		ratio,
		quality: qualityForRatio(ratio),
		ignored: false,
	}
}

export function qualityLabelRu (quality: PressQualityBucket): string {
	switch (quality) {
		case 'good':
			return 'Хорошо'
		case 'acceptable':
			return 'Нормально'
		case 'tooShort':
			return 'Слишком коротко'
		case 'tooLong':
			return 'Слишком длинно'
		default:
			return 'Хорошо'
	}
}
