/**
 * Aggregate session history into day / range stats for the Stats screen.
 * Receive and Transmit accuracies stay separate.
 */

import {
	addLocalDays,
	toLocalDateKey,
	type LocalDateString,
	type TrainingDayAggregate,
} from '@/src/domain/daily'
import type { SessionSummary } from './types'

export type SkillAccuracy = {
	correct: number
	total: number
	percent: number | null
}

export type RangeStats = {
	fromDate: LocalDateString
	toDate: LocalDateString
	totalSessions: number
	activeDays: number
	practiceDurationMs: number
	receive: SkillAccuracy
	transmit: SkillAccuracy
	/** Per-day series for charts (includes zero-activity days). */
	days: TrainingDayAggregate[]
}

function emptyDay (dateKey: LocalDateString): TrainingDayAggregate {
	return {
		dateKey,
		sessionCount: 0,
		receiveItemCorrect: 0,
		receiveItemTotal: 0,
		receiveCharacterCorrect: 0,
		receiveCharacterTotal: 0,
		transmitCorrect: 0,
		transmitTotal: 0,
		durationMs: 0,
		receiveCharacterAccuracyPercent: null,
		transmitAccuracyPercent: null,
		hasActivity: false,
	}
}

function isReceiveLike (source: SessionSummary['source']): boolean {
	return (
		source === 'receive' ||
		source === 'daily' ||
		source === 'quick' ||
		source === 'lesson'
	)
}

/**
 * Build per-day aggregates for [fromDate, toDate] inclusive.
 * Days without sessions have hasActivity=false and null accuracies
 * (not 0%).
 */
export function aggregateDays (
	sessions: SessionSummary[],
	fromDate: LocalDateString,
	toDate: LocalDateString,
): TrainingDayAggregate[] {
	const map = new Map<string, TrainingDayAggregate>()
	let cursor = fromDate
	while (cursor <= toDate) {
		map.set(cursor, emptyDay(cursor))
		if (cursor === toDate) {
			break
		}
		cursor = addLocalDays(cursor, 1)
	}

	for (const session of sessions) {
		if (session.localDate < fromDate || session.localDate > toDate) {
			continue
		}
		const day = map.get(session.localDate) ?? emptyDay(session.localDate)
		day.sessionCount += 1
		day.durationMs += Math.max(0, session.durationMs)
		day.hasActivity = true

		if (session.source === 'transmit') {
			day.transmitCorrect += session.correctItems
			day.transmitTotal += session.itemCount
		} else if (isReceiveLike(session.source)) {
			day.receiveItemCorrect += session.correctItems
			day.receiveItemTotal += session.itemCount
			if (
				session.characterCorrect != null &&
				session.characterTotal != null &&
				session.characterTotal > 0
			) {
				day.receiveCharacterCorrect += session.characterCorrect
				day.receiveCharacterTotal += session.characterTotal
			} else {
				// Symbol / lesson: item == character
				day.receiveCharacterCorrect += session.correctItems
				day.receiveCharacterTotal += session.itemCount
			}
		}
		map.set(session.localDate, day)
	}

	const days = [...map.values()].sort((a, b) =>
		a.dateKey.localeCompare(b.dateKey),
	)
	for (const day of days) {
		day.receiveCharacterAccuracyPercent =
			day.receiveCharacterTotal > 0
				? Math.round(
					(day.receiveCharacterCorrect / day.receiveCharacterTotal) *
						100,
				)
				: null
		day.transmitAccuracyPercent =
			day.transmitTotal > 0
				? Math.round((day.transmitCorrect / day.transmitTotal) * 100)
				: null
	}
	return days
}

function skillFromParts (correct: number, total: number): SkillAccuracy {
	return {
		correct,
		total,
		percent: total > 0 ? Math.round((correct / total) * 100) : null,
	}
}

export function aggregateRange (
	sessions: SessionSummary[],
	dayCount: 7 | 30,
	todayKey: LocalDateString = toLocalDateKey(),
): RangeStats {
	const fromDate = addLocalDays(todayKey, -(dayCount - 1))
	const days = aggregateDays(sessions, fromDate, todayKey)

	let receiveCorrect = 0
	let receiveTotal = 0
	let transmitCorrect = 0
	let transmitTotal = 0
	let durationMs = 0
	let activeDays = 0
	let totalSessions = 0

	for (const day of days) {
		totalSessions += day.sessionCount
		durationMs += day.durationMs
		if (day.hasActivity) {
			activeDays += 1
		}
		receiveCorrect += day.receiveCharacterCorrect
		receiveTotal += day.receiveCharacterTotal
		transmitCorrect += day.transmitCorrect
		transmitTotal += day.transmitTotal
	}

	return {
		fromDate,
		toDate: todayKey,
		totalSessions,
		activeDays,
		practiceDurationMs: durationMs,
		receive: skillFromParts(receiveCorrect, receiveTotal),
		transmit: skillFromParts(transmitCorrect, transmitTotal),
		days,
	}
}

export function aggregateToday (
	sessions: SessionSummary[],
	todayKey: LocalDateString = toLocalDateKey(),
): TrainingDayAggregate {
	return (
		aggregateDays(sessions, todayKey, todayKey)[0] ?? emptyDay(todayKey)
	)
}
