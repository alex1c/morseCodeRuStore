/**
 * Learning progress + per-symbol stats contracts for adaptive Phase 5.
 */

/** ISO date string YYYY-MM-DD in local calendar terms (stored as plain string). */
export type LocalDateString = string

export type LearningProgress = {
	/** Active course id (ru-main or latin-main). */
	currentCourseId: string
	/** Lesson id currently in focus (e.g. lesson-1). */
	currentLessonId: string
	/** Lesson ids the user may open. */
	unlockedLessonIds: string[]
	/** Completed lessons across courses. */
	completedLessonIds: string[]
	/** Best percent score by lesson id. */
	bestLessonScorePercentById: Record<string, number>
	/** Symbol ids already introduced / considered known. */
	knownSymbolIds: string[]
	/** Last practice/session calendar date, or null if never practiced. */
	lastSessionDate: LocalDateString | null
}

export const DEFAULT_LEARNING_PROGRESS: LearningProgress = {
	currentCourseId: 'ru-main',
	currentLessonId: 'ru-lesson-1',
	unlockedLessonIds: ['ru-lesson-1'],
	completedLessonIds: [],
	bestLessonScorePercentById: {},
	knownSymbolIds: [],
	lastSessionDate: null,
}

/**
 * Per-symbol statistics.
 * confusionMap[answerSymbolId] counts how often the user answered that
 * symbol when this symbol was the expected target — e.g. Ж → Ф.
 */
export type SymbolStats = {
	symbolId: string
	attempts: number
	correct: number
	incorrect: number
	/** Running average response time in milliseconds. */
	averageResponseTimeMs: number
	lastPracticedAt: string | null
	confusionMap: Record<string, number>
}

export type SymbolStatsMap = Record<string, SymbolStats>

/**
 * Create empty stats for a symbol id (used when first seen).
 */
export function createEmptySymbolStats (symbolId: string): SymbolStats {
	return {
		symbolId,
		attempts: 0,
		correct: 0,
		incorrect: 0,
		averageResponseTimeMs: 0,
		lastPracticedAt: null,
		confusionMap: {},
	}
}
