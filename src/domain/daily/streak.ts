/**
 * Streak computation from Daily completion date keys.
 * Regularity counts — accuracy does not gate streak.
 */

import {
	addLocalDays,
	diffLocalDays,
	toLocalDateKey,
	type LocalDateString,
} from './date'
import type { DailyState, StreakState, StreakStatus } from './types'

function uniqueSortedDates (dates: LocalDateString[]): LocalDateString[] {
	return [...new Set(dates)].sort()
}

/**
 * Compute current / best streak from completion dates and "today".
 *
 * Rules:
 * - Completing Daily today continues a streak that includes yesterday.
 * - Missing a full calendar day after last completion breaks the streak
 *   once today ends without completion — but if last completion was
 *   yesterday and today is not done yet, streak stays active (at-risk).
 * - Same-day repeats do not increase streak.
 */
export function computeStreakState (
	completedDates: LocalDateString[],
	todayKey: LocalDateString = toLocalDateKey(),
): StreakState {
	const dates = uniqueSortedDates(completedDates)
	if (dates.length === 0) {
		return {
			current: 0,
			best: 0,
			lastCompletedDate: null,
			status: 'none',
			completedToday: false,
		}
	}

	const lastCompletedDate = dates[dates.length - 1]
	const completedToday = lastCompletedDate === todayKey
	const best = longestConsecutiveRun(dates)

	// Walk backward from the streak tip.
	const tip = completedToday
		? todayKey
		: lastCompletedDate === addLocalDays(todayKey, -1)
			? lastCompletedDate
			: null

	let current = 0
	let status: StreakStatus = 'broken'

	if (tip) {
		let cursor = tip
		const set = new Set(dates)
		while (set.has(cursor)) {
			current += 1
			cursor = addLocalDays(cursor, -1)
		}
		status = completedToday ? 'active' : 'at-risk'
	} else {
		// Last completion older than yesterday → streak broken for display.
		const gap = diffLocalDays(todayKey, lastCompletedDate)
		status = gap >= 2 ? 'broken' : 'none'
		current = 0
	}

	return {
		current,
		best: Math.max(best, current),
		lastCompletedDate,
		status,
		completedToday,
	}
}

function longestConsecutiveRun (sortedAsc: LocalDateString[]): number {
	if (sortedAsc.length === 0) {
		return 0
	}
	let best = 1
	let run = 1
	for (let i = 1; i < sortedAsc.length; i += 1) {
		if (diffLocalDays(sortedAsc[i], sortedAsc[i - 1]) === 1) {
			run += 1
			best = Math.max(best, run)
		} else if (sortedAsc[i] !== sortedAsc[i - 1]) {
			run = 1
		}
	}
	return best
}

/**
 * Record a Daily completion date (idempotent for the same day).
 */
export function applyDailyCompletion (
	state: DailyState,
	completion: {
		dateKey: LocalDateString
		completedAt: string
		itemsCorrect: number
		itemsTotal: number
		characterAccuracyPercent: number | null
		durationMs: number
	},
	maxDates = 400,
): DailyState {
	const already = state.completedDates.includes(completion.dateKey)
	const completedDates = already
		? state.completedDates
		: [...state.completedDates, completion.dateKey]

	const trimmed =
		completedDates.length > maxDates
			? uniqueSortedDates(completedDates).slice(-maxDates)
			: completedDates

	return {
		completedDates: trimmed,
		lastCompletion: {
			dateKey: completion.dateKey,
			completedAt: completion.completedAt,
			itemsCorrect: completion.itemsCorrect,
			itemsTotal: completion.itemsTotal,
			characterAccuracyPercent: completion.characterAccuracyPercent,
			durationMs: completion.durationMs,
		},
	}
}

export function emptyDailyState (): DailyState {
	return {
		completedDates: [],
		lastCompletion: null,
	}
}
