/**
 * Weighted word picker from the built-in corpus.
 * Never introduces letters outside the unlocked symbol set.
 */

import {
	createSeededRandom,
	type RandomLike,
} from '@/src/domain/learning/session'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	filterEligibleItems,
	getWordItems,
	wordMatchesLengthTier,
} from './catalog'
import { pickWeightedId } from './group-generator'
import type {
	PracticeAlphabet,
	PracticeItem,
	WordLengthTier,
} from './types'

export type PickWordsInput = {
	alphabet: PracticeAlphabet
	allowedSymbolIds: string[]
	tier: WordLengthTier
	count: number
	seed: number
	weights?: AdaptiveWeightMap
	/**
	 * Scales how strongly per-symbol weights affect word ranking.
	 * 1 = raw average weight; higher = prefer weak-heavy words more.
	 */
	weakBoost?: number
}

const MIN_WORD_WEIGHT = 0.05

/**
 * Score a word by average weight of its required symbols.
 * Weak symbols (high weight) pull the word score up.
 */
export function scoreWordForWeights (
	item: PracticeItem,
	weights: AdaptiveWeightMap | undefined,
	weakBoost = 1,
): number {
	if (!weights || item.requiredSymbolIds.length === 0) {
		return 1
	}
	let sum = 0
	let known = 0
	for (const id of item.requiredSymbolIds) {
		const w = weights[id]
		if (Number.isFinite(w) && (w as number) > 0) {
			sum += w as number
			known += 1
		} else {
			sum += MIN_WORD_WEIGHT
		}
	}
	const avg = sum / item.requiredSymbolIds.length
	const boost = Math.max(0, weakBoost)
	// Words with more known weak symbols get a mild extra nudge.
	const coverage = known / item.requiredSymbolIds.length
	return Math.max(MIN_WORD_WEIGHT, avg * boost * (0.75 + 0.25 * coverage))
}

function shuffleInPlace<T> (items: T[], random: RandomLike): void {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random.next() * (i + 1))
		const tmp = items[i]
		items[i] = items[j]
		items[j] = tmp
	}
}

/**
 * Deterministic weighted sample without replacement from a pool.
 */
function pickWeightedUnique (
	pool: PracticeItem[],
	count: number,
	random: RandomLike,
	weights: AdaptiveWeightMap | undefined,
	weakBoost: number,
): PracticeItem[] {
	const remaining = [...pool]
	const chosen: PracticeItem[] = []
	while (chosen.length < count && remaining.length > 0) {
		const scoreMap: AdaptiveWeightMap = {}
		const ids = remaining.map((item, index) => {
			const key = String(index)
			scoreMap[key] = scoreWordForWeights(item, weights, weakBoost)
			return key
		})
		const key = pickWeightedId(ids, random, scoreMap)
		const index = Number(key)
		chosen.push(remaining[index])
		remaining.splice(index, 1)
	}
	return chosen
}

/**
 * Pick practice words eligible under unlocked symbols + length tier.
 * If fewer than `count` exist, cycles the eligible set with reshuffles
 * rather than introducing unknown letters. Returns [] when none eligible.
 */
export function pickWords (input: PickWordsInput): PracticeItem[] {
	if (input.count <= 0) {
		return []
	}

	const eligible = filterEligibleItems(
		getWordItems(input.alphabet),
		input.allowedSymbolIds,
	).filter((item) => wordMatchesLengthTier(item, input.tier))

	if (eligible.length === 0) {
		return []
	}

	const random = createSeededRandom(input.seed)
	const weakBoost = input.weakBoost ?? 1
	const result: PracticeItem[] = []

	// Cycle full unique passes until we fill the session.
	while (result.length < input.count) {
		const need = input.count - result.length
		const batch = pickWeightedUnique(
			eligible,
			Math.min(need, eligible.length),
			random,
			input.weights,
			weakBoost,
		)
		result.push(...batch)
		if (batch.length === 0) {
			break
		}
		// Reshuffle eligible order seed for the next reuse cycle.
		if (result.length < input.count) {
			shuffleInPlace(eligible, random)
		}
	}

	return result.slice(0, input.count)
}
