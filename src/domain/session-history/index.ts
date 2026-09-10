/**
 * Session history domain barrel.
 */

export type {
	SessionAlphabet,
	SessionHistoryState,
	SessionSource,
	SessionSummary,
} from './types'
export { SESSION_HISTORY_MAX } from './types'

export {
	appendSessionSummary,
	emptySessionHistory,
	latestSessions,
	sessionsInDateRange,
} from './history'

export {
	aggregateDays,
	aggregateRange,
	aggregateToday,
	type RangeStats,
	type SkillAccuracy,
} from './aggregate'
