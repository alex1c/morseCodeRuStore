/**
 * Daily training types (Phase 8).
 */

import type { PracticeContentKind } from '@/src/domain/practice-content'
import type { LocalDateString } from './date'

export type DailyAlphabet = 'RU' | 'LATIN'

export type DailyMasteryLevel = 'beginner' | 'intermediate' | 'advanced'

export type DailySegmentKind =
	| 'symbol'
	| 'group'
	| 'word'
	| 'digits'
	| 'phrase'

export type DailySegment = {
	kind: DailySegmentKind
	/** How many Receive questions in this segment. */
	count: number
	/** Symbol pool for this segment (known / eligible). */
	symbolPool: string[]
	/** Optional content hints for Receive settings. */
	groupLength?: 2 | 3 | 4
	wordLengthTier?: 'short' | 'medium' | 'mixed'
	digitGroupLength?: 1 | 2 | 3
}

export type DailyPlan = {
	dateKey: LocalDateString
	alphabet: DailyAlphabet
	level: DailyMasteryLevel
	/** Deterministic seed for generators. */
	seed: number
	/** Total planned items across segments. */
	totalItems: number
	segments: DailySegment[]
	/** UX label only — not a hard SLA. */
	estimateLabel: string
	/** Short mix summary for Home. */
	mixSummary: string
}

export type DailyCompletion = {
	dateKey: LocalDateString
	/** First completion timestamp ISO for that day. */
	completedAt: string
	itemsCorrect: number
	itemsTotal: number
	characterAccuracyPercent: number | null
	durationMs: number
}

export type DailyState = {
	/** Unique local dates when Daily was completed (newest not required). */
	completedDates: LocalDateString[]
	/** Optional last completion detail for Home card. */
	lastCompletion: DailyCompletion | null
}

export type StreakStatus = 'active' | 'at-risk' | 'broken' | 'none'

export type StreakState = {
	current: number
	best: number
	lastCompletedDate: LocalDateString | null
	status: StreakStatus
	/** True when today is already completed. */
	completedToday: boolean
}

export type TrainingDayAggregate = {
	dateKey: LocalDateString
	sessionCount: number
	receiveItemCorrect: number
	receiveItemTotal: number
	receiveCharacterCorrect: number
	receiveCharacterTotal: number
	transmitCorrect: number
	transmitTotal: number
	durationMs: number
	/** null when no receive character data that day. */
	receiveCharacterAccuracyPercent: number | null
	transmitAccuracyPercent: number | null
	hasActivity: boolean
}

/** Map Daily segment → Receive contentKind. */
export function dailySegmentToContentKind (
	kind: DailySegmentKind,
): PracticeContentKind {
	return kind
}
