/**
 * Receive session question generator — independent from lesson curriculum.
 * Supports optional adaptive weights + recent-history cooldown.
 */

import {
	createSeededRandom,
	generateQuestionOptions,
	getCourseById,
	getSymbolById,
	type RandomLike,
} from '@/src/domain'
import type {
	ReceiveAlphabet,
	ReceiveQuestion,
	ReceiveSessionLength,
	ReceiveSymbolPreset,
} from './types'
import {
	buildAdaptiveSessionPool,
	DEFAULT_COOLDOWN_N,
	hasEnoughAdaptiveData,
	selectWeakSymbolPool,
	type AdaptiveWeightMap,
} from '@/src/domain/adaptive'
import type { SymbolStatsMap } from '@/src/types'

export type GenerateReceiveSessionInput = {
	alphabet: ReceiveAlphabet
	symbolPool: string[]
	sessionLength: ReceiveSessionLength
	seed: number
	/** Finite fallback when infinite is requested for preview/tests. */
	infinitePreviewLength?: number
	/** Optional adaptive weights keyed by symbol id. */
	weights?: AdaptiveWeightMap
	/** Avoid repeating symbols from the last N draws when pool allows. */
	cooldownN?: number
	/**
	 * Soft boost for recently missed symbols (not immediate).
	 * Applied after cooldown window.
	 */
	recentErrorBoost?: Record<string, number>
}

function resolveLength (length: ReceiveSessionLength, preview = 30): number {
	if (length === 'infinite') {
		return preview
	}
	return length
}

function sanitizeWeights (
	pool: string[],
	weights?: AdaptiveWeightMap,
): AdaptiveWeightMap | null {
	if (!weights) {
		return null
	}
	const cleaned: AdaptiveWeightMap = {}
	for (const id of pool) {
		const value = weights[id]
		if (Number.isFinite(value) && (value as number) > 0) {
			cleaned[id] = value as number
		}
	}
	return Object.keys(cleaned).length > 0 ? cleaned : null
}

/**
 * Weighted pick with recent-history cooldown.
 * Falls back to uniform among eligible when weights missing.
 */
export function pickWeightedSymbol (
	pool: string[],
	recent: string[],
	random: RandomLike,
	weights?: AdaptiveWeightMap | null,
	cooldownN = DEFAULT_COOLDOWN_N,
): string {
	if (pool.length === 0) {
		throw new Error('Cannot pick from empty pool')
	}
	if (pool.length === 1) {
		return pool[0]
	}

	const avoid = new Set(recent.slice(-Math.max(0, cooldownN)))
	let candidates = pool.filter((id) => !avoid.has(id))
	if (candidates.length === 0) {
		// Tiny pool fallback: only avoid immediate previous if possible.
		const previous = recent[recent.length - 1]
		candidates = previous
			? pool.filter((id) => id !== previous)
			: [...pool]
		if (candidates.length === 0) {
			candidates = [...pool]
		}
	}

	const localWeights = sanitizeWeights(candidates, weights ?? undefined)
	if (!localWeights) {
		return candidates[Math.floor(random.next() * candidates.length)]
	}

	let sum = 0
	for (const id of candidates) {
		sum += localWeights[id] ?? 0
	}
	if (!(sum > 0) || !Number.isFinite(sum)) {
		return candidates[Math.floor(random.next() * candidates.length)]
	}
	let cursor = random.next() * sum
	for (const id of candidates) {
		cursor -= localWeights[id] ?? 0
		if (cursor <= 0) {
			return id
		}
	}
	return candidates[candidates.length - 1]
}

/**
 * Build a finite question list. Infinite sessions regenerate on demand.
 */
export function generateReceiveQuestions (
	input: GenerateReceiveSessionInput,
): ReceiveQuestion[] {
	const pool = [...new Set(input.symbolPool)].filter((id) => {
		const symbol = getSymbolById(id)
		if (!symbol) {
			return false
		}
		return input.alphabet === 'RU'
			? symbol.family === 'RU'
			: symbol.family === 'LATIN'
	})
	if (pool.length === 0) {
		return []
	}
	const optionPool = expandReceiveOptionPool(input.alphabet, pool)
	const random = createSeededRandom(input.seed)
	const count = resolveLength(
		input.sessionLength,
		input.infinitePreviewLength ?? 30,
	)
	const weights = sanitizeWeights(pool, input.weights)
	const cooldownN = input.cooldownN ?? DEFAULT_COOLDOWN_N
	const questions: ReceiveQuestion[] = []
	const recent: string[] = []
	for (let i = 0; i < count; i += 1) {
		const boosted = { ...(weights ?? {}) }
		if (input.recentErrorBoost) {
			for (const [id, boost] of Object.entries(input.recentErrorBoost)) {
				if (boosted[id] != null) {
					boosted[id] *= 1 + boost
				}
			}
		}
		const symbolId = pickWeightedSymbol(
			pool,
			recent,
			random,
			Object.keys(boosted).length > 0 ? boosted : weights,
			cooldownN,
		)
		recent.push(symbolId)
		questions.push({
			id: `receive-${i + 1}`,
			symbolId,
			optionSymbolIds: generateQuestionOptions(
				symbolId,
				optionPool,
				random,
			),
		})
	}
	return questions
}

/** Uniform helper kept for infinite append / simple callers. */
export function pickNextSymbol (
	pool: string[],
	previous: string | null,
	random: RandomLike,
): string {
	return pickWeightedSymbol(
		pool,
		previous ? [previous] : [],
		random,
		null,
		1,
	)
}

/**
 * Expand a practice pool with same-alphabet course fillers for 4-choice options.
 */
export function expandReceiveOptionPool (
	alphabet: ReceiveAlphabet,
	practicePool: string[],
): string[] {
	const courseId = alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const coursePool =
		getCourseById(courseId)?.lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]) ?? []
	return [...new Set([...practicePool, ...coursePool])].filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === alphabet
	})
}

/**
 * Resolve the practical symbol pool for Receive setup.
 */
export function resolveReceiveSymbolPool (input: {
	alphabet: ReceiveAlphabet
	preset: ReceiveSymbolPreset
	knownSymbolIds: string[]
	customSymbolIds: string[]
	statsMap?: SymbolStatsMap
}): { symbolIds: string[]; hasEnoughData: boolean; weights?: AdaptiveWeightMap } {
	const courseId = input.alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const course = getCourseById(courseId)
	const available =
		course?.lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]) ?? []
	const uniqueAvailable = [...new Set(available)].filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === input.alphabet
	})

	if (input.preset === 'custom') {
		const ids = input.customSymbolIds.filter((id) =>
			uniqueAvailable.includes(id) ||
			getSymbolById(id)?.family === input.alphabet,
		)
		return { symbolIds: ids, hasEnoughData: true }
	}
	if (input.preset === 'all-available') {
		return { symbolIds: uniqueAvailable, hasEnoughData: true }
	}
	if (input.preset === 'weak') {
		const statsMap = input.statsMap ?? {}
		const weak = selectWeakSymbolPool({
			statsMap,
			alphabet: input.alphabet,
			knownSymbolIds: input.knownSymbolIds,
		})
		return {
			symbolIds: weak.symbolIds,
			hasEnoughData: weak.hasEnoughData,
		}
	}
	if (input.preset === 'adaptive') {
		const statsMap = input.statsMap ?? {}
		const plan = buildAdaptiveSessionPool({
			statsMap,
			alphabet: input.alphabet,
			knownSymbolIds: input.knownSymbolIds,
		})
		return {
			symbolIds: plan.symbolIds,
			hasEnoughData: plan.hasEnoughData || hasEnoughAdaptiveData(
				statsMap,
				input.alphabet,
			),
			weights: plan.weights,
		}
	}

	const known = input.knownSymbolIds.filter((id) =>
		uniqueAvailable.includes(id),
	)
	if (known.length > 0) {
		return { symbolIds: known, hasEnoughData: true }
	}
	return {
		symbolIds: uniqueAvailable.slice(0, 2),
		hasEnoughData: true,
	}
}
