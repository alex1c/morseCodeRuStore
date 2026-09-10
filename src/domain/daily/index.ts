/**
 * Public Daily domain API.
 */

export {
	WEEKDAY_LABELS_RU,
	addLocalDays,
	diffLocalDays,
	getDayNowMs,
	localWeekdayIndex,
	parseLocalDateKey,
	resetDayClockForTests,
	setDayClockForTests,
	toLocalDateKey,
	type DayClock,
	type LocalDateString,
} from './date'

export {
	DAILY_COMPLETION_MAX_DATES,
	DAILY_ESTIMATE_LABEL,
	DAILY_POOL_MIX,
	DAILY_TARGET_ITEMS,
	masteryLevelFromKnownCount,
} from './config'

export type {
	DailyAlphabet,
	DailyCompletion,
	DailyMasteryLevel,
	DailyPlan,
	DailySegment,
	DailySegmentKind,
	DailyState,
	StreakState,
	StreakStatus,
	TrainingDayAggregate,
} from './types'
export { dailySegmentToContentKind } from './types'

export {
	applyDailyCompletion,
	computeStreakState,
	emptyDailyState,
} from './streak'

export {
	buildDailyPlan,
	dailySeedFor,
	type BuildDailyPlanInput,
} from './plan'
