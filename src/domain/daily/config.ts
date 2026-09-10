/**
 * Daily mix configuration — percentages live here, not in UI.
 */

export const DAILY_TARGET_ITEMS = 48

/** Pool composition for adaptive symbol selection inside Daily. */
export const DAILY_POOL_MIX = {
	current: 0.5,
	weak: 0.25,
	overdue: 0.15,
	strongReview: 0.1,
} as const

export const DAILY_ESTIMATE_LABEL = '≈ 5 минут'

/** Keep at most this many completion date keys. */
export const DAILY_COMPLETION_MAX_DATES = 400

export function masteryLevelFromKnownCount (
	knownLetterCount: number,
): import('./types').DailyMasteryLevel {
	if (knownLetterCount < 8) {
		return 'beginner'
	}
	if (knownLetterCount < 16) {
		return 'intermediate'
	}
	return 'advanced'
}
