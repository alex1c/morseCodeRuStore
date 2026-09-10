/**
 * Session history helpers — append, prune, filter.
 */

import type { SessionHistoryState, SessionSummary } from './types'
import { SESSION_HISTORY_MAX } from './types'

export function emptySessionHistory (): SessionHistoryState {
	return { sessions: [] }
}

/**
 * Prepend a session and prune to max (newest first).
 * Idempotent when the same id already exists.
 */
export function appendSessionSummary (
	state: SessionHistoryState,
	summary: SessionSummary,
	max = SESSION_HISTORY_MAX,
): SessionHistoryState {
	if (state.sessions.some((item) => item.id === summary.id)) {
		return state
	}
	const sessions = [summary, ...state.sessions].slice(0, max)
	return { sessions }
}

export function sessionsInDateRange (
	sessions: SessionSummary[],
	fromDateInclusive: string,
	toDateInclusive: string,
): SessionSummary[] {
	return sessions.filter(
		(s) =>
			s.localDate >= fromDateInclusive &&
			s.localDate <= toDateInclusive,
	)
}

export function latestSessions (
	sessions: SessionSummary[],
	limit: number,
): SessionSummary[] {
	return sessions.slice(0, limit)
}
