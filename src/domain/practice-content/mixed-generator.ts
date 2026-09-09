/**
 * Mixed letter + digit group generator.
 * Only used when the learner explicitly enables letters+digits practice.
 */

import {
	createSeededRandom,
} from '@/src/domain/learning/session'
import { getSymbolById, listDigits } from '@/src/domain/morse'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import {
	isDigitSymbolId,
	pickNextGroupSymbol,
	resolveGroupPool,
	sanitizeListeningPoolIds,
} from './group-generator'
import type { GroupLength, PracticeAlphabet, PracticeItem } from './types'

export type GenerateMixedGroupInput = {
	alphabet: PracticeAlphabet
	/** Letter (and optionally pre-filtered) pool — digits come from catalog. */
	letterPoolIds: string[]
	length: GroupLength
	seed: number
	weights?: AdaptiveWeightMap
	cooldownN?: number
}

function symbolChar (id: string): string {
	const symbol = getSymbolById(id)
	if (!symbol) {
		throw new Error(`Unknown symbol id: ${id}`)
	}
	if (symbol.character === 'Ё') {
		return 'Е'
	}
	return symbol.character
}

/**
 * Build a group that includes at least one letter and one digit when length ≥ 2.
 * kind remains 'group'; required ids may include digit-* entries.
 */
export function generateMixedGroup (
	input: GenerateMixedGroupInput,
): PracticeItem {
	const letters = resolveGroupPool(
		input.letterPoolIds,
		input.alphabet,
		false,
	)
	const digits = sanitizeListeningPoolIds(
		listDigits().map((s) => s.id),
	)
	if (letters.length === 0) {
		throw new Error('generateMixedGroup: empty letter pool')
	}
	if (digits.length === 0) {
		throw new Error('generateMixedGroup: empty digit pool')
	}

	const combined = sanitizeListeningPoolIds([...letters, ...digits])
	const random = createSeededRandom(input.seed)
	const cooldownN = input.cooldownN ?? 1
	const picked: string[] = []

	// Reserve slots so length≥2 groups always mix both families.
	const letterIndex = Math.floor(random.next() * input.length)
	let digitIndex = Math.floor(random.next() * input.length)
	if (digitIndex === letterIndex) {
		digitIndex = (letterIndex + 1) % input.length
	}

	for (let i = 0; i < input.length; i += 1) {
		if (i === letterIndex) {
			picked.push(
				pickNextGroupSymbol(
					letters,
					picked.filter((id) => !isDigitSymbolId(id)),
					random,
					input.weights ?? null,
					cooldownN,
					input.length,
				),
			)
			continue
		}
		if (i === digitIndex) {
			picked.push(
				pickNextGroupSymbol(
					digits,
					picked.filter((id) => isDigitSymbolId(id)),
					random,
					input.weights ?? null,
					cooldownN,
					input.length,
				),
			)
			continue
		}
		picked.push(
			pickNextGroupSymbol(
				combined,
				picked,
				random,
				input.weights ?? null,
				cooldownN,
				input.length,
			),
		)
	}

	const text = picked.map(symbolChar).join('')
	const requiredSymbolIds = picked.map((id) =>
		id === 'ru-yo' ? 'ru-e' : id,
	)

	return {
		id: `group-mixed:${input.alphabet}:${text}:${input.seed}`,
		kind: 'group',
		alphabet: input.alphabet,
		text,
		requiredSymbolIds,
		symbolCount: requiredSymbolIds.length,
		difficulty: input.length + 1,
	}
}
