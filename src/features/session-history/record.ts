/**
 * Build SessionSummary rows from finished practice results.
 */

import {
	toLocalDateKey,
	type SessionAlphabet,
	type SessionSource,
	type SessionSummary,
} from '@/src/domain'
import type { LessonResult } from '@/src/domain/learning'
import type {
	ReceiveSessionResult,
	ReceiveSettings,
} from '@/src/features/receive'
import type { TransmitSessionResult } from '@/src/features/transmit'
import { wallTimeMs } from '@/src/utils/clock'

/** Stable-enough id: wall time + short random fragment. */
export function createSessionId (prefix: string): string {
	const rand = Math.floor(Math.random() * 1_000_000)
		.toString(36)
		.padStart(4, '0')
	return `${prefix}-${wallTimeMs()}-${rand}`
}

function itemAccuracyPercent (correct: number, total: number): number {
	if (total <= 0) {
		return 0
	}
	return Math.round((correct / total) * 100)
}

/**
 * Receive / Daily / Quick Practice → SessionSummary.
 */
export function buildReceiveSessionSummary (input: {
	id: string
	result: ReceiveSessionResult
	settings: ReceiveSettings
	source: SessionSource
	durationMs: number
	finishedAt?: string
}): SessionSummary {
	const finishedAt = input.finishedAt ?? new Date().toISOString()
	const alphabet: SessionAlphabet = input.settings.alphabet
	return {
		id: input.id,
		finishedAt,
		localDate: toLocalDateKey(new Date(finishedAt)),
		source: input.source,
		alphabet,
		contentKind: input.settings.contentKind,
		itemCount: input.result.total,
		correctItems: input.result.correct,
		itemAccuracyPercent: input.result.accuracyPercent,
		characterCorrect: input.result.characterCorrect,
		characterTotal: input.result.characterTotal,
		characterAccuracyPercent: input.result.characterAccuracyPercent,
		durationMs: Math.max(0, input.durationMs),
		averageResponseTimeMs: input.result.averageResponseTimeMs,
		lessonId: null,
		courseId: null,
		transmitTimingQuality: null,
	}
}

/**
 * Lesson finish → SessionSummary (source lesson).
 */
export function buildLessonSessionSummary (input: {
	id: string
	result: LessonResult
	durationMs: number
	finishedAt?: string
}): SessionSummary {
	const finishedAt = input.finishedAt ?? new Date().toISOString()
	const alphabet: SessionAlphabet =
		input.result.courseId === 'ru-main' ? 'RU' : 'LATIN'
	return {
		id: input.id,
		finishedAt,
		localDate: toLocalDateKey(new Date(finishedAt)),
		source: 'lesson',
		alphabet,
		contentKind: 'symbol',
		itemCount: input.result.total,
		correctItems: input.result.correct,
		itemAccuracyPercent: input.result.accuracyPercent,
		characterCorrect: input.result.correct,
		characterTotal: input.result.total,
		characterAccuracyPercent: input.result.accuracyPercent,
		durationMs: Math.max(0, input.durationMs),
		averageResponseTimeMs: null,
		lessonId: input.result.lessonId,
		courseId: input.result.courseId,
		transmitTimingQuality: null,
	}
}

/**
 * Transmit finish → SessionSummary (timing quality stays separate).
 */
export function buildTransmitSessionSummary (input: {
	id: string
	result: TransmitSessionResult
	alphabet: 'RU' | 'LATIN'
	durationMs: number
	/** Optional average quality 0–1 from answered presses. */
	timingQuality?: number | null
	finishedAt?: string
}): SessionSummary {
	const finishedAt = input.finishedAt ?? new Date().toISOString()
	return {
		id: input.id,
		finishedAt,
		localDate: toLocalDateKey(new Date(finishedAt)),
		source: 'transmit',
		alphabet: input.alphabet,
		contentKind: null,
		itemCount: input.result.total,
		correctItems: input.result.correct,
		itemAccuracyPercent: itemAccuracyPercent(
			input.result.correct,
			input.result.total,
		),
		characterCorrect: null,
		characterTotal: null,
		characterAccuracyPercent: null,
		durationMs: Math.max(0, input.durationMs),
		averageResponseTimeMs: null,
		lessonId: null,
		courseId: null,
		transmitTimingQuality:
			input.timingQuality == null
				? null
				: Math.round(input.timingQuality * 1000) / 1000,
	}
}
