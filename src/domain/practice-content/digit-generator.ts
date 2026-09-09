/**
 * Digit-only group generator (0–9 Morse sequences).
 * Digits are shared across alphabets; PracticeItem.alphabet is for UI context.
 */

import {
	createSeededRandom,
} from '@/src/domain/learning/session'
import { getSymbolById, listDigits } from '@/src/domain/morse'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	pickNextGroupSymbol,
	sanitizeListeningPoolIds,
} from './group-generator'
import type {
	DigitGroupLength,
	PracticeAlphabet,
	PracticeItem,
} from './types'

export type GenerateDigitGroupInput = {
	length: DigitGroupLength
	seed: number
	weights?: AdaptiveWeightMap
	/** UI / session alphabet context (digits themselves are shared). */
	alphabet?: PracticeAlphabet
	/** Soft adjacent cooldown when the digit pool allows. */
	cooldownN?: number
}

/**
 * Build one deterministic digit PracticeItem.
 */
export function generateDigitGroup (
	input: GenerateDigitGroupInput,
): PracticeItem {
	const alphabet: PracticeAlphabet = input.alphabet ?? 'RU'
	const pool = sanitizeListeningPoolIds(
		listDigits().map((symbol) => symbol.id),
	)
	if (pool.length === 0) {
		throw new Error('generateDigitGroup: no digits in catalog')
	}

	const random = createSeededRandom(input.seed)
	const picked: string[] = []
	for (let i = 0; i < input.length; i += 1) {
		picked.push(
			pickNextGroupSymbol(
				pool,
				picked,
				random,
				input.weights ?? null,
				input.cooldownN ?? 1,
				input.length,
			),
		)
	}

	const text = picked
		.map((id) => {
			const symbol = getSymbolById(id)
			if (!symbol) {
				throw new Error(`Unknown digit id: ${id}`)
			}
			return symbol.character
		})
		.join('')

	return {
		id: `digits:${text}:${input.seed}`,
		kind: 'digits',
		alphabet,
		text,
		requiredSymbolIds: picked,
		symbolCount: picked.length,
		difficulty: input.length,
	}
}
