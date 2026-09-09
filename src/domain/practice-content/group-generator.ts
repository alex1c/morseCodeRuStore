/**
 * Seeded random character-group generator for listening practice.
 * Groups are nonsense sequences — pure ear training, not vocabulary.
 */

import {
	createSeededRandom,
	type RandomLike,
} from '@/src/domain/learning/session'
import { getSymbolById, listDigits } from '@/src/domain/morse'
import type { AdaptiveWeightMap } from '@/src/domain/adaptive'
import type { GroupLength, PracticeAlphabet, PracticeItem } from './types'

const DEFAULT_COOLDOWN_N = 1
const MIN_WEIGHT = 0.05

export type GenerateRandomGroupInput = {
	alphabet: PracticeAlphabet
	/** Candidate MorseSymbol ids (letters and optionally digits). */
	poolSymbolIds: string[]
	length: GroupLength
	seed: number
	/** Higher weight → more frequent draws (weak symbols). */
	weights?: AdaptiveWeightMap
	/** Avoid reusing symbols from the last N picks when the pool allows. */
	cooldownN?: number
	/** When true, digit ids present in the pool may be drawn. */
	allowDigits?: boolean
}

/**
 * Listening never treats Ё as distinct — map ru-yo → ru-e.
 */
export function sanitizeListeningPoolIds (ids: string[]): string[] {
	const out: string[] = []
	const seen = new Set<string>()
	for (const raw of ids) {
		const id = raw === 'ru-yo' ? 'ru-e' : raw
		if (seen.has(id)) {
			continue
		}
		seen.add(id)
		out.push(id)
	}
	return out
}

function isDigitId (symbolId: string): boolean {
	return getSymbolById(symbolId)?.family === 'DIGIT'
}

/**
 * Restrict pool to usable symbols for the alphabet / digit policy.
 */
export function resolveGroupPool (
	poolSymbolIds: string[],
	alphabet: PracticeAlphabet,
	allowDigits = false,
): string[] {
	const digitIds = new Set(listDigits().map((s) => s.id))
	const cleaned = sanitizeListeningPoolIds(poolSymbolIds)
	return cleaned.filter((id) => {
		const symbol = getSymbolById(id)
		if (!symbol || !symbol.enabled) {
			return false
		}
		if (digitIds.has(id) || symbol.family === 'DIGIT') {
			return allowDigits
		}
		if (symbol.family === 'PUNCTUATION') {
			return false
		}
		return symbol.family === alphabet
	})
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
 * Weighted pick among candidates (uniform when weights missing).
 */
export function pickWeightedId (
	candidates: string[],
	random: RandomLike,
	weights?: AdaptiveWeightMap | null,
): string {
	if (candidates.length === 0) {
		throw new Error('Cannot pick from empty candidate list')
	}
	if (candidates.length === 1) {
		return candidates[0]
	}
	const local = sanitizeWeights(candidates, weights ?? undefined)
	if (!local) {
		return candidates[Math.floor(random.next() * candidates.length)]
	}
	let sum = 0
	for (const id of candidates) {
		sum += local[id] ?? MIN_WEIGHT
	}
	if (!(sum > 0) || !Number.isFinite(sum)) {
		return candidates[Math.floor(random.next() * candidates.length)]
	}
	let cursor = random.next() * sum
	for (const id of candidates) {
		cursor -= local[id] ?? MIN_WEIGHT
		if (cursor <= 0) {
			return id
		}
	}
	return candidates[candidates.length - 1]
}

/**
 * Soft cap on how often one symbol may appear in a short group.
 * Prevents ЖЖЖЖ when the pool has diversity.
 */
function maxRepeatsForLength (length: number): number {
	return Math.max(1, Math.ceil(length / 2))
}

function countId (picked: string[], id: string): number {
	let n = 0
	for (const x of picked) {
		if (x === id) {
			n += 1
		}
	}
	return n
}

/**
 * Pick the next symbol for a group with cooldown + repeat limits.
 */
export function pickNextGroupSymbol (
	pool: string[],
	picked: string[],
	random: RandomLike,
	weights?: AdaptiveWeightMap | null,
	cooldownN = DEFAULT_COOLDOWN_N,
	length = picked.length + 1,
): string {
	if (pool.length === 0) {
		throw new Error('Cannot build group from empty pool')
	}

	const avoidRecent = new Set(
		picked.slice(-Math.max(0, cooldownN)),
	)
	const maxRepeats = maxRepeatsForLength(length)

	let candidates = pool.filter((id) => {
		if (avoidRecent.has(id)) {
			return false
		}
		if (countId(picked, id) >= maxRepeats) {
			return false
		}
		return true
	})

	if (candidates.length === 0) {
		// Relax repeat cap first, still avoid immediate previous when possible.
		const previous = picked[picked.length - 1]
		candidates = pool.filter((id) => id !== previous)
		if (candidates.length === 0) {
			candidates = [...pool]
		}
	}

	return pickWeightedId(candidates, random, weights)
}

function idsToText (ids: string[]): string {
	return ids
		.map((id) => {
			const symbol = getSymbolById(id)
			if (!symbol) {
				throw new Error(`Unknown symbol id in group: ${id}`)
			}
			// Listening display: Ё → Е if a yo id slipped through.
			if (symbol.character === 'Ё') {
				return 'Е'
			}
			return symbol.character
		})
		.join('')
}

/**
 * Build one deterministic random character group PracticeItem.
 */
export function generateRandomGroup (
	input: GenerateRandomGroupInput,
): PracticeItem {
	const allowDigits = input.allowDigits === true
	const pool = resolveGroupPool(
		input.poolSymbolIds,
		input.alphabet,
		allowDigits,
	)
	if (pool.length === 0) {
		throw new Error('generateRandomGroup: empty usable pool')
	}

	const random = createSeededRandom(input.seed)
	const cooldownN = input.cooldownN ?? DEFAULT_COOLDOWN_N
	const weightMap = sanitizeWeights(pool, input.weights)
	const picked: string[] = []

	for (let i = 0; i < input.length; i += 1) {
		picked.push(
			pickNextGroupSymbol(
				pool,
				picked,
				random,
				weightMap,
				cooldownN,
				input.length,
			),
		)
	}

	const text = idsToText(picked)
	const requiredSymbolIds = picked.map((id) =>
		id === 'ru-yo' ? 'ru-e' : id,
	)

	return {
		id: `group:${input.alphabet}:${text}:${input.seed}`,
		kind: 'group',
		alphabet: input.alphabet,
		text,
		requiredSymbolIds,
		symbolCount: requiredSymbolIds.length,
		difficulty: input.length,
	}
}

/** Exposed for mixed/digit helpers that need digit membership checks. */
export function listDigitIdSet (): Set<string> {
	return new Set(listDigits().map((s) => s.id))
}

export function isDigitSymbolId (symbolId: string): boolean {
	return isDigitId(symbolId)
}
