/**
 * Phrase picker from the built-in corpus.
 * Same eligibility gate as words — never introduce unknown letters.
 */

import {
	createSeededRandom,
	type RandomLike,
} from '@/src/domain/learning/session'
import {
	filterEligibleItems,
	getPhraseItems,
} from './catalog'
import type { PracticeAlphabet, PracticeItem } from './types'

export type PickPhrasesInput = {
	alphabet: PracticeAlphabet
	allowedSymbolIds: string[]
	count: number
	seed: number
}

function shuffleCopy<T> (items: T[], random: RandomLike): T[] {
	const copy = [...items]
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random.next() * (i + 1))
		const tmp = copy[i]
		copy[i] = copy[j]
		copy[j] = tmp
	}
	return copy
}

/**
 * Pick eligible phrases. Returns [] when none unlock under allowed symbols.
 * When eligible count < requested, cycles with reshuffled order.
 */
export function pickPhrases (input: PickPhrasesInput): PracticeItem[] {
	if (input.count <= 0) {
		return []
	}

	const eligible = filterEligibleItems(
		getPhraseItems(input.alphabet),
		input.allowedSymbolIds,
	)
	if (eligible.length === 0) {
		return []
	}

	const random = createSeededRandom(input.seed)
	const result: PracticeItem[] = []
	while (result.length < input.count) {
		const order = shuffleCopy(eligible, random)
		for (const item of order) {
			result.push(item)
			if (result.length >= input.count) {
				break
			}
		}
	}
	return result.slice(0, input.count)
}
