/**
 * Pool selection: weak, adaptive mix, pair, single-symbol focused.
 */

import { getSymbolById } from '@/src/domain/morse'
import { getCourseById } from '@/src/domain/learning'
import type { SymbolStatsMap } from '@/src/types'
import {
	ADAPTIVE_POOL_MIX,
	MIN_ADAPTIVE_DATA_SYMBOLS,
	MIN_ATTEMPTS_FOR_WEAKNESS,
	MIN_WEAK_POOL_SIZE,
	PAIR_TRAINING_DISTRACTORS,
	RECENCY_DAYS,
	SINGLE_TARGET_DISTRACTORS,
} from './constants'
import { extractConfusionPairs } from './confusion'
import { evaluateMasteryMap, evaluateSymbolMastery } from './mastery'
import { getAdaptiveNowMs } from './clock'
import {
	buildAdaptiveWeights,
	buildFocusedWeights,
} from './weights'
import type { AdaptivePoolPlan, ConfusionPair, SymbolMastery } from './types'

function courseSymbolIds (alphabet: 'RU' | 'LATIN'): string[] {
	const courseId = alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const lessons = getCourseById(courseId)?.lessons ?? []
	return [...new Set(
		lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]),
	)].filter((id) => getSymbolById(id)?.family === alphabet)
}

function filterAlphabet (
	ids: string[],
	alphabet: 'RU' | 'LATIN',
): string[] {
	return ids.filter((id) => getSymbolById(id)?.family === alphabet)
}

function uniquePush (target: string[], ids: string[], limit?: number): void {
	for (const id of ids) {
		if (limit != null && target.length >= limit) {
			return
		}
		if (!target.includes(id)) {
			target.push(id)
		}
	}
}

export function hasEnoughAdaptiveData (
	statsMap: SymbolStatsMap,
	alphabet: 'RU' | 'LATIN',
): boolean {
	const eligible = Object.values(statsMap).filter((stats) => {
		const symbol = getSymbolById(stats.symbolId)
		return (
			symbol?.family === alphabet &&
			stats.attempts >= MIN_ATTEMPTS_FOR_WEAKNESS
		)
	})
	return eligible.length >= MIN_ADAPTIVE_DATA_SYMBOLS
}

export function listMasteryForAlphabet (
	statsMap: SymbolStatsMap,
	alphabet: 'RU' | 'LATIN',
	candidateIds?: string[],
	nowMs: number = getAdaptiveNowMs(),
): SymbolMastery[] {
	const pool = filterAlphabet(
		candidateIds && candidateIds.length > 0
			? candidateIds
			: [
				...courseSymbolIds(alphabet),
				...Object.keys(statsMap),
			],
		alphabet,
	)
	const unique = [...new Set(pool)]
	return evaluateMasteryMap(statsMap, unique, nowMs).sort(
		(a, b) => b.weaknessScore - a.weaknessScore,
	)
}

/**
 * Select weak symbols; pad with learning/review until minimum pool size.
 */
export function selectWeakSymbolPool (input: {
	statsMap: SymbolStatsMap
	alphabet: 'RU' | 'LATIN'
	knownSymbolIds: string[]
	minSize?: number
	nowMs?: number
}): { symbolIds: string[]; hasEnoughData: boolean } {
	const minSize = input.minSize ?? MIN_WEAK_POOL_SIZE
	const nowMs = input.nowMs ?? getAdaptiveNowMs()
	const enough = hasEnoughAdaptiveData(input.statsMap, input.alphabet)
	if (!enough) {
		return { symbolIds: [], hasEnoughData: false }
	}

	const mastery = listMasteryForAlphabet(
		input.statsMap,
		input.alphabet,
		undefined,
		nowMs,
	)
	const weak = mastery
		.filter((item) => item.tier === 'weak' && !item.insufficientData)
		.map((item) => item.symbolId)
	const learning = mastery
		.filter(
			(item) =>
				(item.tier === 'learning' || item.labelKey === 'needsReview') &&
				!weak.includes(item.symbolId),
		)
		.map((item) => item.symbolId)

	const selected: string[] = []
	uniquePush(selected, weak)
	uniquePush(selected, learning, minSize)
	const known = filterAlphabet(input.knownSymbolIds, input.alphabet)
	uniquePush(selected, known, minSize)
	uniquePush(selected, courseSymbolIds(input.alphabet), minSize)

	return {
		symbolIds: selected.slice(0, Math.max(minSize, weak.length)),
		hasEnoughData: selected.length > 0,
	}
}

/**
 * Smart adaptive pool mix from domain config shares.
 */
export function buildAdaptiveSessionPool (input: {
	statsMap: SymbolStatsMap
	alphabet: 'RU' | 'LATIN'
	knownSymbolIds: string[]
	nowMs?: number
}): AdaptivePoolPlan {
	const nowMs = input.nowMs ?? getAdaptiveNowMs()
	const enough = hasEnoughAdaptiveData(input.statsMap, input.alphabet)
	if (!enough) {
		const known = filterAlphabet(input.knownSymbolIds, input.alphabet)
		const fallback =
			known.length > 0 ? known : courseSymbolIds(input.alphabet).slice(0, 4)
		const mastery = listMasteryForAlphabet(
			input.statsMap,
			input.alphabet,
			fallback,
			nowMs,
		)
		return {
			symbolIds: fallback,
			weights: buildAdaptiveWeights(mastery),
			hasEnoughData: false,
		}
	}

	const mastery = listMasteryForAlphabet(
		input.statsMap,
		input.alphabet,
		undefined,
		nowMs,
	)
	const weakIds = mastery
		.filter((m) => m.tier === 'weak' && !m.insufficientData)
		.slice(0, ADAPTIVE_POOL_MIX.maxWeak)
		.map((m) => m.symbolId)
	const confusedIds = extractConfusionPairs(input.statsMap, input.alphabet)
		.flatMap((pair) => [pair.symbolIdA, pair.symbolIdB])
		.filter((id, index, arr) => arr.indexOf(id) === index)
		.slice(0, ADAPTIVE_POOL_MIX.maxConfused)
	const overdueIds = mastery
		.filter(
			(m) =>
				m.daysSincePractice != null &&
				m.daysSincePractice >= RECENCY_DAYS.week,
		)
		.slice(0, ADAPTIVE_POOL_MIX.maxOverdue)
		.map((m) => m.symbolId)
	const strongIds = mastery
		.filter((m) => m.tier === 'strong' || m.tier === 'stable')
		.slice(0, ADAPTIVE_POOL_MIX.maxStrong)
		.map((m) => m.symbolId)

	const selected: string[] = []
	uniquePush(selected, weakIds)
	uniquePush(selected, confusedIds)
	uniquePush(selected, overdueIds)
	uniquePush(selected, strongIds)
	uniquePush(
		selected,
		filterAlphabet(input.knownSymbolIds, input.alphabet),
		MIN_WEAK_POOL_SIZE,
	)
	uniquePush(selected, courseSymbolIds(input.alphabet), MIN_WEAK_POOL_SIZE)

	const selectedMastery = selected.map((id) =>
		evaluateSymbolMastery(input.statsMap[id], id, nowMs),
	)
	return {
		symbolIds: selected,
		weights: buildAdaptiveWeights(selectedMastery),
		hasEnoughData: true,
	}
}

export function buildPairTrainingPlan (input: {
	statsMap: SymbolStatsMap
	alphabet: 'RU' | 'LATIN'
	symbolIdA: string
	symbolIdB: string
	knownSymbolIds: string[]
}): AdaptivePoolPlan {
	const targets = filterAlphabet(
		[input.symbolIdA, input.symbolIdB],
		input.alphabet,
	)
	const distractors = filterAlphabet(
		[
			...input.knownSymbolIds,
			...courseSymbolIds(input.alphabet),
		],
		input.alphabet,
	)
		.filter((id) => !targets.includes(id))
		.slice(0, PAIR_TRAINING_DISTRACTORS)

	const symbolIds = [...targets, ...distractors]
	return {
		symbolIds,
		weights: buildFocusedWeights(targets, distractors, 1, 0.28),
		hasEnoughData: true,
	}
}

export function buildSingleSymbolTrainingPlan (input: {
	statsMap: SymbolStatsMap
	alphabet: 'RU' | 'LATIN'
	targetSymbolId: string
	knownSymbolIds: string[]
}): AdaptivePoolPlan {
	const target = filterAlphabet([input.targetSymbolId], input.alphabet)
	if (target.length === 0) {
		return { symbolIds: [], weights: {}, hasEnoughData: false }
	}
	const distractors = filterAlphabet(
		[
			...input.knownSymbolIds,
			...courseSymbolIds(input.alphabet),
		],
		input.alphabet,
	)
		.filter((id) => id !== input.targetSymbolId)
		.slice(0, SINGLE_TARGET_DISTRACTORS)

	const symbolIds = [...target, ...distractors]
	return {
		symbolIds,
		weights: buildFocusedWeights(target, distractors, 1, 0.3),
		hasEnoughData: true,
	}
}

export function listOverdueSymbols (
	mastery: SymbolMastery[],
	limit = 6,
): SymbolMastery[] {
	return mastery
		.filter(
			(item) =>
				item.daysSincePractice != null &&
				item.daysSincePractice >= RECENCY_DAYS.week &&
				item.attempts > 0,
		)
		.sort(
			(a, b) =>
				(b.daysSincePractice ?? 0) - (a.daysSincePractice ?? 0),
		)
		.slice(0, limit)
}

export function listWeakForDisplay (
	mastery: SymbolMastery[],
	limit = 12,
): SymbolMastery[] {
	return mastery
		.filter((item) => !item.insufficientData && item.tier === 'weak')
		.slice(0, limit)
}

export type { ConfusionPair }
