/**
 * Flatten a DailyPlan into one Receive question list (mixed content kinds).
 */

import {
	buildPracticeSessionPlan,
	dailySegmentToContentKind,
	type DailyPlan,
	type DailySegment,
	type PracticeSessionLength,
} from '@/src/domain'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	buildReceiveQuestionsFromPlan,
	generateReceiveQuestions,
	type ReceiveQuestion,
	type ReceiveSessionLength,
} from '@/src/features/receive'

/** Allowed practice lengths per content kind (matches session-plan asserts). */
function allowedPracticeLengths (
	kind: Exclude<ReturnType<typeof dailySegmentToContentKind>, 'symbol'>,
): PracticeSessionLength[] {
	if (kind === 'phrase') {
		return [5, 10]
	}
	if (kind === 'digits') {
		return [10, 20, 50]
	}
	return [5, 10, 20]
}

function allowedSymbolLengths (): ReceiveSessionLength[] {
	return [5, 10, 20, 50]
}

/**
 * Pick a batch size that covers as much of `remaining` as possible.
 */
function pickBatchLength (
	allowed: number[],
	remaining: number,
): number {
	const exactOrLarger = allowed.find((n) => n >= remaining)
	if (exactOrLarger != null) {
		return exactOrLarger
	}
	return allowed[allowed.length - 1]
}

/**
 * Generate exactly `count` symbol questions using seeded Receive generator.
 */
function buildSymbolSegmentQuestions (input: {
	segment: DailySegment
	alphabet: 'RU' | 'LATIN'
	seed: number
	weights?: AdaptiveWeightMap
	idOffset: number
}): ReceiveQuestion[] {
	const out: ReceiveQuestion[] = []
	let remaining = input.segment.count
	let batchIndex = 0
	while (remaining > 0) {
		const batch = pickBatchLength(
			allowedSymbolLengths() as number[],
			remaining,
		) as 5 | 10 | 20 | 50
		const take = Math.min(remaining, batch)
		const generated = generateReceiveQuestions({
			alphabet: input.alphabet,
			symbolPool: input.segment.symbolPool,
			sessionLength: batch,
			seed: input.seed + batchIndex * 10_007,
			weights: input.weights,
		}).slice(0, take)
		for (const question of generated) {
			out.push({
				...question,
				id: `daily-${input.idOffset + out.length + 1}`,
			})
		}
		remaining -= generated.length
		batchIndex += 1
		// Safety: avoid infinite loop if pool empty.
		if (generated.length === 0) {
			break
		}
	}
	return out
}

/**
 * Generate exactly `count` multi-char questions via practice session plans.
 */
function buildPracticeSegmentQuestions (input: {
	segment: DailySegment
	alphabet: 'RU' | 'LATIN'
	seed: number
	weights?: AdaptiveWeightMap
	idOffset: number
}): ReceiveQuestion[] {
	const contentKind = dailySegmentToContentKind(input.segment.kind)
	if (contentKind === 'symbol') {
		return []
	}
	const out: ReceiveQuestion[] = []
	let remaining = input.segment.count
	let batchIndex = 0
	const allowed = allowedPracticeLengths(contentKind)
	while (remaining > 0) {
		const batch = pickBatchLength(allowed, remaining) as PracticeSessionLength
		const take = Math.min(remaining, batch)
		const plan = buildPracticeSessionPlan({
			contentKind,
			alphabet: input.alphabet,
			allowedSymbolIds: input.segment.symbolPool,
			seed: input.seed + batchIndex * 10_007,
			sessionLength: batch,
			groupLength: (input.segment.groupLength ?? 3) as 2 | 3 | 4 | 5,
			digitLength: (input.segment.digitGroupLength ?? 3) as 1 | 2 | 3 | 4 | 5,
			wordTier: input.segment.wordLengthTier ?? 'mixed',
			weights: input.weights,
			allowDigits: false,
			mixedLettersAndDigits: false,
		})
		if (plan.blockedReason || plan.items.length === 0) {
			break
		}
		const questions = buildReceiveQuestionsFromPlan(
			plan.items.slice(0, take),
		)
		for (const question of questions) {
			out.push({
				...question,
				id: `daily-${input.idOffset + out.length + 1}`,
			})
		}
		remaining -= questions.length
		batchIndex += 1
	}
	return out
}

/**
 * Walk Daily segments and concatenate Receive questions for one session.
 */
export function buildDailyQuestions (input: {
	plan: DailyPlan
	weights?: AdaptiveWeightMap
}): ReceiveQuestion[] {
	const questions: ReceiveQuestion[] = []
	let segmentOffset = 0
	for (const segment of input.plan.segments) {
		if (segment.count <= 0) {
			continue
		}
		const seed = input.plan.seed + segmentOffset * 97_331
		const chunk =
			segment.kind === 'symbol'
				? buildSymbolSegmentQuestions({
					segment,
					alphabet: input.plan.alphabet,
					seed,
					weights: input.weights,
					idOffset: questions.length,
				})
				: buildPracticeSegmentQuestions({
					segment,
					alphabet: input.plan.alphabet,
					seed,
					weights: input.weights,
					idOffset: questions.length,
				})
		questions.push(...chunk)
		segmentOffset += 1
	}
	return questions
}
