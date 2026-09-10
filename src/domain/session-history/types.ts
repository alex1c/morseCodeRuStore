/**
 * Session history types for Stats / Daily (Phase 8).
 */

export type SessionSource =
	| 'lesson'
	| 'receive'
	| 'transmit'
	| 'daily'
	| 'quick'

export type SessionAlphabet = 'RU' | 'LATIN' | 'BOTH' | null

export type SessionSummary = {
	id: string
	/** ISO timestamp when session finished. */
	finishedAt: string
	/** Local calendar day of the session. */
	localDate: string
	source: SessionSource
	alphabet: SessionAlphabet
	/** Receive content kind when applicable. */
	contentKind: string | null
	itemCount: number
	correctItems: number
	itemAccuracyPercent: number
	characterCorrect: number | null
	characterTotal: number | null
	characterAccuracyPercent: number | null
	durationMs: number
	averageResponseTimeMs: number | null
	lessonId: string | null
	courseId: string | null
	/** Transmit-only quality average 0–1, not mixed into receive %. */
	transmitTimingQuality: number | null
}

export const SESSION_HISTORY_MAX = 250

export type SessionHistoryState = {
	sessions: SessionSummary[]
}
