/**
 * Typed analytics event names + allowlisted privacy-safe properties.
 * Never send user free text, answers, Morse content, backup paths, or weak symbols.
 */

export const ANALYTICS_EVENTS = {
	APP_OPEN: 'app_open',
	ONBOARDING_COMPLETED: 'onboarding_completed',
	ALPHABET_SELECTED: 'alphabet_selected',
	LESSON_STARTED: 'lesson_started',
	LESSON_COMPLETED: 'lesson_completed',
	RECEIVE_STARTED: 'receive_started',
	RECEIVE_COMPLETED: 'receive_completed',
	TRANSMIT_STARTED: 'transmit_started',
	TRANSMIT_COMPLETED: 'transmit_completed',
	DAILY_STARTED: 'daily_started',
	DAILY_COMPLETED: 'daily_completed',
	WEAK_TRAINING_STARTED: 'weak_training_started',
	PAIR_TRAINING_STARTED: 'pair_training_started',
	QUICK_PRACTICE_STARTED: 'quick_practice_started',
	TRANSLATOR_OPENED: 'translator_opened',
	REFERENCE_OPENED: 'reference_opened',
	LEARNING_OPENED: 'learning_opened',
	OUTPUT_MODE_USED: 'output_mode_used',
	BACKUP_EXPORT_SUCCESS: 'backup_export_success',
	BACKUP_RESTORE_SUCCESS: 'backup_restore_success',
	BACKUP_RESTORE_FAILED: 'backup_restore_failed',
} as const

export type AnalyticsEventName =
	(typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

/**
 * Coarse allowlisted properties only.
 * Forbidden keys (text, input, answer, phrase, content, filename, path, …)
 * are stripped even if somehow passed.
 */
export type SafeAnalyticsProps = {
	alphabet?: 'ru' | 'latin' | 'both'
	course?: 'ru_main' | 'latin_main'
	lesson_id?: string
	score_bucket?: string
	content_kind?: 'symbol' | 'group' | 'word' | 'phrase' | 'digits'
	answer_mode?: 'choices' | 'keyboard' | 'paper'
	session_length_bucket?: string
	wpm_bucket?: string
	accuracy_bucket?: string
	rhythm_quality_bucket?: string
	output_mode?: 'audio' | 'vibration' | 'flashlight'
}

export const SAFE_ANALYTICS_PROP_KEYS = new Set<keyof SafeAnalyticsProps>([
	'alphabet',
	'course',
	'lesson_id',
	'score_bucket',
	'content_kind',
	'answer_mode',
	'session_length_bucket',
	'wpm_bucket',
	'accuracy_bucket',
	'rhythm_quality_bucket',
	'output_mode',
])

/** Keys that must never appear in analytics payloads. */
export const FORBIDDEN_ANALYTICS_PROP_KEYS = [
	'text',
	'input',
	'answer',
	'phrase',
	'content',
	'filename',
	'filepath',
	'path',
	'backup',
	'symbol',
	'weak',
	'pair',
	'morse',
] as const
