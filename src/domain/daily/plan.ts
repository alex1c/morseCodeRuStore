/**
 * Deterministic Daily plan builder.
 */

import {
	listMasteryForAlphabet,
	listOverdueSymbols,
	listWeakForDisplay,
	type AdaptiveWeightMap,
} from '@/src/domain/adaptive'
import { createSeededRandom } from '@/src/domain/learning'
import { getSymbolById } from '@/src/domain/morse'
import type { SymbolStatsMap } from '@/src/types'
import {
	DAILY_ESTIMATE_LABEL,
	DAILY_POOL_MIX,
	DAILY_TARGET_ITEMS,
	masteryLevelFromKnownCount,
} from './config'
import type { LocalDateString } from './date'
import type {
	DailyAlphabet,
	DailyMasteryLevel,
	DailyPlan,
	DailySegment,
	DailySegmentKind,
} from './types'

function hashSeed (parts: string[]): number {
	let hash = 0x811c9dc5
	const text = parts.join('|')
	for (let i = 0; i < text.length; i += 1) {
		hash ^= text.charCodeAt(i)
		hash = Math.imul(hash, 0x01000193)
	}
	return hash >>> 0
}

function letterOnly (ids: string[], alphabet: DailyAlphabet): string[] {
	return [...new Set(ids)].filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === alphabet && symbol.category === 'letter'
	})
}

function takeUnique (
	target: string[],
	source: string[],
	limit: number,
	allowed: Set<string>,
): void {
	for (const id of source) {
		if (target.length >= limit) {
			return
		}
		if (allowed.has(id) && !target.includes(id)) {
			target.push(id)
		}
	}
}

function buildMixedPool (input: {
	alphabet: DailyAlphabet
	knownSymbolIds: string[]
	statsMap: SymbolStatsMap
	random: { next: () => number }
}): { pool: string[]; weights: AdaptiveWeightMap } {
	const known = letterOnly(input.knownSymbolIds, input.alphabet)
	const fallback =
		known.length > 0
			? known
			: letterOnly(
				input.alphabet === 'RU'
					? ['ru-a', 'ru-t', 'ru-n', 'ru-o']
					: ['latin-e', 'latin-t', 'latin-a', 'latin-n'],
				input.alphabet,
			)
	const allowed = new Set(fallback)
	const mastery = listMasteryForAlphabet(
		input.statsMap,
		input.alphabet,
		fallback,
	)
	const weak = listWeakForDisplay(mastery, 12).map((m) => m.symbolId)
	const overdue = listOverdueSymbols(mastery, 8).map((m) => m.symbolId)
	const strong = mastery
		.filter((m) => m.tier === 'strong' || m.tier === 'stable')
		.map((m) => m.symbolId)

	const targetSize = Math.max(4, Math.min(20, fallback.length))
	const wantCurrent = Math.max(1, Math.round(targetSize * DAILY_POOL_MIX.current))
	const wantWeak = Math.max(0, Math.round(targetSize * DAILY_POOL_MIX.weak))
	const wantOverdue = Math.max(
		0,
		Math.round(targetSize * DAILY_POOL_MIX.overdue),
	)

	const pool: string[] = []
	// Shuffle known for "current material" slice
	const shuffledKnown = [...fallback].sort(
		(a, b) => input.random.next() - 0.5 || a.localeCompare(b),
	)
	takeUnique(pool, shuffledKnown, wantCurrent, allowed)
	takeUnique(pool, weak, pool.length + wantWeak, allowed)
	takeUnique(pool, overdue, pool.length + wantOverdue, allowed)
	takeUnique(pool, strong, targetSize, allowed)
	takeUnique(pool, shuffledKnown, targetSize, allowed)

	const weights: AdaptiveWeightMap = {}
	for (const id of pool) {
		const m = mastery.find((item) => item.symbolId === id)
		weights[id] = m ? Math.max(0.15, m.weaknessScore) : 0.35
	}
	return { pool, weights }
}

function segmentsForLevel (
	level: DailyMasteryLevel,
	total: number,
	pool: string[],
	canWords: boolean,
	canPhrases: boolean,
	canDigits: boolean,
): DailySegment[] {
	const mk = (
		kind: DailySegmentKind,
		count: number,
		extra?: Partial<DailySegment>,
	): DailySegment => ({
		kind,
		count,
		symbolPool: pool,
		...extra,
	})

	if (level === 'beginner') {
		const groups = Math.max(1, Math.round(total * 0.35))
		const symbols = Math.max(1, total - groups)
		return [
			mk('symbol', symbols),
			mk('group', groups, { groupLength: 2 }),
		]
	}

	if (level === 'intermediate') {
		const symbols = Math.round(total * 0.35)
		let groups = Math.round(total * 0.35)
		let words = canWords ? total - symbols - groups : 0
		if (!canWords) {
			groups = total - symbols
			words = 0
		}
		const segs: DailySegment[] = [
			mk('symbol', Math.max(1, symbols)),
			mk('group', Math.max(1, groups), { groupLength: 3 }),
		]
		if (words > 0) {
			segs.push(mk('word', words, { wordLengthTier: 'short' }))
		}
		return segs
	}

	let remaining = total
	const segs: DailySegment[] = []
	const groups = Math.round(total * 0.3)
	segs.push(mk('group', groups, { groupLength: 3 }))
	remaining -= groups

	const words = canWords ? Math.round(total * 0.3) : 0
	if (words > 0) {
		const n = Math.min(words, remaining)
		segs.push(mk('word', n, { wordLengthTier: 'mixed' }))
		remaining -= n
	}

	const digits = canDigits ? Math.round(total * 0.2) : 0
	if (digits > 0 && remaining > 0) {
		const n = Math.min(digits, remaining)
		segs.push(mk('digits', n, { digitGroupLength: 3 }))
		remaining -= n
	}

	const phrases = canPhrases ? Math.min(5, remaining) : 0
	if (phrases > 0) {
		segs.push(mk('phrase', phrases))
		remaining -= phrases
	}

	if (remaining > 0) {
		segs.push(mk('symbol', remaining))
	}
	return segs.filter((s) => s.count > 0)
}

function mixSummary (level: DailyMasteryLevel): string {
	if (level === 'beginner') {
		return 'Символы + короткие группы'
	}
	if (level === 'intermediate') {
		return 'Слабые символы + группы + короткие слова'
	}
	return 'Группы + слова + цифры + фразы'
}

export type BuildDailyPlanInput = {
	dateKey: LocalDateString
	alphabet: DailyAlphabet
	knownSymbolIds: string[]
	statsMap: SymbolStatsMap
	hasEligibleShortWords?: boolean
	hasEligiblePhrases?: boolean
	digitsUnlocked?: boolean
	targetItems?: number
}

/**
 * Build a deterministic Daily plan for the given local date + progress.
 */
export function buildDailyPlan (input: BuildDailyPlanInput): DailyPlan {
	const knownLetters = letterOnly(input.knownSymbolIds, input.alphabet)
	const level = masteryLevelFromKnownCount(knownLetters.length)
	const seed = hashSeed([
		input.dateKey,
		input.alphabet,
		...[...knownLetters].sort(),
	])
	const random = createSeededRandom(seed)
	const { pool } = buildMixedPool({
		alphabet: input.alphabet,
		knownSymbolIds: knownLetters,
		statsMap: input.statsMap,
		random,
	})

	const total = input.targetItems ?? DAILY_TARGET_ITEMS
	const canWords =
		input.hasEligibleShortWords !== false && knownLetters.length >= 6
	const canPhrases =
		input.hasEligiblePhrases === true || knownLetters.length >= 18
	const canDigits =
		input.digitsUnlocked === true || knownLetters.length >= 12

	const segments = segmentsForLevel(
		level,
		total,
		pool,
		canWords,
		canPhrases,
		canDigits,
	)
	const totalItems = segments.reduce((sum, s) => sum + s.count, 0)

	return {
		dateKey: input.dateKey,
		alphabet: input.alphabet,
		level,
		seed,
		totalItems,
		segments,
		estimateLabel: DAILY_ESTIMATE_LABEL,
		mixSummary: mixSummary(level),
	}
}

export function dailySeedFor (
	dateKey: LocalDateString,
	alphabet: DailyAlphabet,
	knownSymbolIds: string[],
): number {
	const known = letterOnly(knownSymbolIds, alphabet).sort()
	return hashSeed([dateKey, alphabet, ...known])
}
