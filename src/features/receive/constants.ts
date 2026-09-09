/**
 * Receive UX constants — keep feedback timing centralized.
 */

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
}
