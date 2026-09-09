/**
 * Receive UX constants — keep feedback timing centralized.
 */

import type { ReceiveContentKind, ReceiveSessionLength } from './types'

export const RECEIVE_FEEDBACK_CORRECT_MS = 550

export const RECEIVE_WPM_MIN = 5
export const RECEIVE_WPM_MAX = 40
export const RECEIVE_WPM_STEP = 1

export const RECEIVE_TONE_MIN = 400
export const RECEIVE_TONE_MAX = 1000
export const RECEIVE_TONE_STEP = 50

export const RECEIVE_SPACING_OPTIONS = [1, 1.5, 2, 3] as const

export const DEFAULT_RECEIVE_SETTINGS = {
	alphabet: 'RU' as const,
	answerMode: 'choices' as const,
	symbolPreset: 'known' as const,
	customSymbolIds: [] as string[],
	sessionLength: 20 as const,
	characterWpm: 12,
	farnsworthMultiplier: 1.5,
	toneFrequencyHz: 600,
	contentKind: 'symbol' as const,
	groupLength: 3 as const,
	digitGroupLength: 3 as const,
	wordLengthTier: 'mixed' as const,
	includeMixedDigits: false,
}

/** Session length chips allowed for each content kind. */
export function sessionLengthsForKind (
	kind: ReceiveContentKind,
): ReceiveSessionLength[] {
	switch (kind) {
		case 'symbol':
			return [10, 20, 50, 'infinite']
		case 'group':
		case 'word':
			return [5, 10, 20]
		case 'phrase':
			return [5, 10]
		case 'digits':
			return [10, 20, 50]
		default: {
			const _exhaustive: never = kind
			return _exhaustive
		}
	}
}

/** Sensible default length when switching content kind. */
export function defaultSessionLengthForKind (
	kind: ReceiveContentKind,
): ReceiveSessionLength {
	switch (kind) {
		case 'symbol':
			return 20
		case 'group':
		case 'word':
			return 10
		case 'phrase':
			return 5
		case 'digits':
			return 20
		default: {
			const _exhaustive: never = kind
			return _exhaustive
		}
	}
}
