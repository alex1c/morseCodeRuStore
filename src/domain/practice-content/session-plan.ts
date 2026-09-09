/**
 * Build a full listening practice session of PracticeItems.
 * Session length menus differ by content kind (see Phase 7).
 */

import { generateDigitGroup } from './digit-generator'
import { generateRandomGroup } from './group-generator'
import { generateMixedGroup } from './mixed-generator'
import { pickPhrases } from './phrase-generator'
import { pickWords } from './word-generator'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import type {
	DigitGroupLength,
	GroupLength,
	PracticeAlphabet,
	PracticeContentKind,
	PracticeItem,
	WordLengthTier,
} from './types'

/** Content kinds that this planner can assemble (not single-symbol). */
export type PracticeSessionContentKind = Exclude<
	PracticeContentKind,
	'symbol'
>

/** Allowed session sizes: groups/words 5|10|20; phrases 5|10; digits 10|20|50. */
export type PracticeSessionLength = 5 | 10 | 20 | 50

export type BuildPracticeSessionInput = {
	contentKind: PracticeSessionContentKind
	alphabet: PracticeAlphabet
	/** Unlocked / selected symbol ids (letters; digits optional for mixed). */
	allowedSymbolIds: string[]
	seed: number
	sessionLength: PracticeSessionLength
	/** Random / mixed group length (default 3). */
	groupLength?: GroupLength
	/** Digit group length (default 3). */
	digitLength?: DigitGroupLength
	/** Word length tier (default mixed). */
	wordTier?: WordLengthTier
	weights?: AdaptiveWeightMap
	cooldownN?: number
	/**
	 * When contentKind === 'group' and true, build mixed letter+digit groups
	 * (at least one of each). Plain allowDigits without this flag still uses
	 * generateRandomGroup with digits optionally in the pool.
	 */
	allowDigits?: boolean
	/** Force mixed letter+digit groups (implies allowDigits). */
	mixedLettersAndDigits?: boolean
	/** Amplifies weak-symbol preference for word picks. */
	weakBoost?: number
}

export type PracticeSessionPlan = {
	items: PracticeItem[]
	/** Set when the session cannot start (e.g. no eligible phrases). */
	blockedReason?: string
}

const PHRASE_BLOCKED_REASON =
	'Фразы откроются после изучения большего количества букв.'

function assertSessionLength (
	contentKind: PracticeSessionContentKind,
	sessionLength: PracticeSessionLength,
): string | null {
	if (contentKind === 'phrase') {
		if (sessionLength !== 5 && sessionLength !== 10) {
			return `Phrase sessions support length 5 or 10 (got ${sessionLength})`
		}
		return null
	}
	if (contentKind === 'digits') {
		if (
			sessionLength !== 10 &&
			sessionLength !== 20 &&
			sessionLength !== 50
		) {
			return `Digit sessions support length 10, 20, or 50 (got ${sessionLength})`
		}
		return null
	}
	// group / word / mixed
	if (
		sessionLength !== 5 &&
		sessionLength !== 10 &&
		sessionLength !== 20
	) {
		return `${contentKind} sessions support length 5, 10, or 20 (got ${sessionLength})`
	}
	return null
}

/**
 * Generate a deterministic practice session plan for the requested content kind.
 */
export function buildPracticeSessionPlan (
	input: BuildPracticeSessionInput,
): PracticeSessionPlan {
	const lengthError = assertSessionLength(
		input.contentKind,
		input.sessionLength,
	)
	if (lengthError) {
		return { items: [], blockedReason: lengthError }
	}

	const groupLength: GroupLength = input.groupLength ?? 3
	const digitLength: DigitGroupLength = input.digitLength ?? 3
	const wordTier: WordLengthTier = input.wordTier ?? 'mixed'
	const count = input.sessionLength

	switch (input.contentKind) {
		case 'group': {
			const items: PracticeItem[] = []
			for (let i = 0; i < count; i += 1) {
				const itemSeed = input.seed + i * 9973
				if (input.mixedLettersAndDigits === true) {
					items.push(
						generateMixedGroup({
							alphabet: input.alphabet,
							letterPoolIds: input.allowedSymbolIds,
							length: groupLength,
							seed: itemSeed,
							weights: input.weights,
							cooldownN: input.cooldownN,
						}),
					)
				} else {
					items.push(
						generateRandomGroup({
							alphabet: input.alphabet,
							poolSymbolIds: input.allowedSymbolIds,
							length: groupLength,
							seed: itemSeed,
							weights: input.weights,
							cooldownN: input.cooldownN,
							allowDigits: input.allowDigits === true,
						}),
					)
				}
			}
			return { items }
		}
		case 'word': {
			const items = pickWords({
				alphabet: input.alphabet,
				allowedSymbolIds: input.allowedSymbolIds,
				tier: wordTier,
				count,
				seed: input.seed,
				weights: input.weights,
				weakBoost: input.weakBoost,
			})
			return { items }
		}
		case 'phrase': {
			const items = pickPhrases({
				alphabet: input.alphabet,
				allowedSymbolIds: input.allowedSymbolIds,
				count,
				seed: input.seed,
			})
			if (items.length === 0) {
				return {
					items: [],
					blockedReason: PHRASE_BLOCKED_REASON,
				}
			}
			return { items }
		}
		case 'digits': {
			const items: PracticeItem[] = []
			for (let i = 0; i < count; i += 1) {
				items.push(
					generateDigitGroup({
						length: digitLength,
						seed: input.seed + i * 9973,
						weights: input.weights,
						alphabet: input.alphabet,
						cooldownN: input.cooldownN,
					}),
				)
			}
			return { items }
		}
		default: {
			const _exhaustive: never = input.contentKind
			return {
				items: [],
				blockedReason: `Unsupported content kind: ${_exhaustive}`,
			}
		}
	}
}
