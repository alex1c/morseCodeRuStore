/**
 * Confusion pairs, weights, selection, cooldown, distribution.
 */

import {
	assertWeightsValid,
	buildAdaptiveWeights,
	buildFocusedWeights,
	buildPairTrainingPlan,
	buildSingleSymbolTrainingPlan,
	createSeededRandom,
	evaluateSymbolMastery,
	extractConfusionPairs,
	selectWeakSymbolPool,
	hasEnoughAdaptiveData,
	resetAdaptiveClockForTests,
	setAdaptiveClockForTests,
} from '@/src/domain'
import {
	generateReceiveQuestions,
	pickWeightedSymbol,
} from '@/src/features/receive'
import { createEmptySymbolStats, type SymbolStatsMap } from '@/src/types'

const NOW = Date.parse('2026-09-09T12:00:00.000Z')

beforeEach(() => {
	setAdaptiveClockForTests({ nowMs: () => NOW })
})
afterEach(() => {
	resetAdaptiveClockForTests()
})

function makeStats (partial: Partial<ReturnType<typeof createEmptySymbolStats>> & { symbolId: string }) {
	return {
		...createEmptySymbolStats(partial.symbolId),
		...partial,
	}
}

describe('confusion pairs', () => {
	test('preserves directional counts and aggregates', () => {
		const map: SymbolStatsMap = {
			'ru-zh': makeStats({
				symbolId: 'ru-zh',
				attempts: 10,
				correct: 3,
				incorrect: 7,
				confusionMap: { 'ru-f': 7 },
			}),
			'ru-f': makeStats({
				symbolId: 'ru-f',
				attempts: 8,
				correct: 5,
				incorrect: 3,
				confusionMap: { 'ru-zh': 2 },
			}),
		}
		const pairs = extractConfusionPairs(map, 'RU')
		expect(pairs[0]).toMatchObject({
			symbolIdA: 'ru-f',
			symbolIdB: 'ru-zh',
			aToB: 2,
			bToA: 7,
			total: 9,
		})
	})

	test('isolates alphabets', () => {
		const map: SymbolStatsMap = {
			'ru-a': makeStats({
				symbolId: 'ru-a',
				attempts: 5,
				incorrect: 3,
				confusionMap: { 'ru-n': 3 },
			}),
			'latin-a': makeStats({
				symbolId: 'latin-a',
				attempts: 5,
				incorrect: 4,
				confusionMap: { 'latin-n': 4 },
			}),
		}
		const ru = extractConfusionPairs(map, 'RU')
		const latin = extractConfusionPairs(map, 'LATIN')
		expect(ru.every((p) => p.symbolIdA.startsWith('ru-'))).toBe(true)
		expect(latin.every((p) => p.symbolIdA.startsWith('latin-'))).toBe(true)
	})
})

describe('adaptive weights', () => {
	test('weak weight greater than strong; no NaN; strong floor', () => {
		const weak = evaluateSymbolMastery(
			makeStats({
				symbolId: 'ru-zh',
				attempts: 12,
				correct: 3,
				incorrect: 9,
				averageResponseTimeMs: 2800,
				lastPracticedAt: '2026-08-01T00:00:00.000Z',
				confusionMap: { 'ru-f': 6 },
			}),
			'ru-zh',
		)
		const strong = evaluateSymbolMastery(
			makeStats({
				symbolId: 'ru-a',
				attempts: 20,
				correct: 19,
				incorrect: 1,
				averageResponseTimeMs: 700,
				lastPracticedAt: '2026-09-09T10:00:00.000Z',
			}),
			'ru-a',
		)
		const weights = buildAdaptiveWeights([weak, strong])
		expect(assertWeightsValid(weights)).toBe(true)
		expect(weights['ru-zh']).toBeGreaterThan(weights['ru-a'])
		expect(weights['ru-a']).toBeGreaterThan(0)
	})
})

describe('weighted distribution + cooldown', () => {
	test('weighted sample favors weak ids', () => {
		const pool = ['ru-a', 'ru-t', 'ru-n', 'ru-o']
		const weights = {
			'ru-a': 0.05,
			'ru-t': 0.05,
			'ru-n': 0.05,
			'ru-o': 0.85,
		}
		const random = createSeededRandom(12345)
		const counts: Record<string, number> = {
			'ru-a': 0,
			'ru-t': 0,
			'ru-n': 0,
			'ru-o': 0,
		}
		const recent: string[] = []
		for (let i = 0; i < 3000; i += 1) {
			const id = pickWeightedSymbol(pool, recent, random, weights, 1)
			counts[id] += 1
			recent.push(id)
		}
		expect(counts['ru-o']).toBeGreaterThan(counts['ru-a'])
		expect(counts['ru-o']).toBeGreaterThan(counts['ru-t'])
		expect(counts['ru-o'] / 3000).toBeGreaterThan(0.4)
	})

	test('cooldown avoids immediate and recent repeats when possible', () => {
		const pool = ['ru-a', 'ru-t', 'ru-n', 'ru-o']
		const random = createSeededRandom(7)
		const recent: string[] = []
		for (let i = 0; i < 40; i += 1) {
			const next = pickWeightedSymbol(pool, recent, random, null, 2)
			if (recent.length >= 1) {
				expect(next).not.toBe(recent[recent.length - 1])
			}
			if (recent.length >= 2) {
				expect(recent.slice(-2)).not.toContain(next)
			}
			recent.push(next)
		}
	})

	test('tiny pool falls back safely', () => {
		const random = createSeededRandom(3)
		expect(pickWeightedSymbol(['ru-a'], ['ru-a'], random, null, 5)).toBe(
			'ru-a',
		)
	})

	test('seeded generateReceiveQuestions with weights is deterministic', () => {
		const input = {
			alphabet: 'RU' as const,
			symbolPool: ['ru-a', 'ru-t', 'ru-n', 'ru-o'],
			sessionLength: 20 as const,
			seed: 99,
			weights: {
				'ru-a': 0.1,
				'ru-t': 0.1,
				'ru-n': 0.1,
				'ru-o': 0.7,
			},
			cooldownN: 2,
		}
		const a = generateReceiveQuestions(input)
		const b = generateReceiveQuestions(input)
		expect(a.map((q) => q.symbolId)).toEqual(b.map((q) => q.symbolId))
	})
})

describe('selection helpers', () => {
	test('weak preset needs enough data', () => {
		const empty = selectWeakSymbolPool({
			statsMap: {},
			alphabet: 'RU',
			knownSymbolIds: ['ru-a', 'ru-t'],
		})
		expect(empty.hasEnoughData).toBe(false)

		const map: SymbolStatsMap = {
			'ru-zh': makeStats({
				symbolId: 'ru-zh',
				attempts: 8,
				correct: 2,
				incorrect: 6,
				lastPracticedAt: '2026-09-01T00:00:00.000Z',
				confusionMap: { 'ru-f': 4 },
			}),
			'ru-f': makeStats({
				symbolId: 'ru-f',
				attempts: 7,
				correct: 2,
				incorrect: 5,
				lastPracticedAt: '2026-09-01T00:00:00.000Z',
			}),
		}
		expect(hasEnoughAdaptiveData(map, 'RU')).toBe(true)
		const weak = selectWeakSymbolPool({
			statsMap: map,
			alphabet: 'RU',
			knownSymbolIds: ['ru-a', 'ru-t', 'ru-zh', 'ru-f'],
		})
		expect(weak.hasEnoughData).toBe(true)
		expect(weak.symbolIds.length).toBeGreaterThanOrEqual(2)
	})

	test('pair training includes targets and distractors', () => {
		const plan = buildPairTrainingPlan({
			statsMap: {},
			alphabet: 'RU',
			symbolIdA: 'ru-zh',
			symbolIdB: 'ru-f',
			knownSymbolIds: ['ru-a', 'ru-t', 'ru-n', 'ru-o'],
		})
		expect(plan.symbolIds).toEqual(
			expect.arrayContaining(['ru-zh', 'ru-f']),
		)
		expect(plan.symbolIds.length).toBeGreaterThan(2)
		expect(plan.weights['ru-zh']).toBeGreaterThan(plan.weights['ru-a'] ?? 0)
		expect(plan.symbolIds.every((id) => id.startsWith('ru-'))).toBe(true)
	})

	test('single-symbol training weights target heavily', () => {
		const plan = buildSingleSymbolTrainingPlan({
			statsMap: {},
			alphabet: 'LATIN',
			targetSymbolId: 'latin-e',
			knownSymbolIds: ['latin-e', 'latin-t', 'latin-a', 'latin-n', 'latin-o'],
		})
		expect(plan.symbolIds[0]).toBe('latin-e')
		expect(plan.weights['latin-e']).toBeGreaterThan(
			plan.weights['latin-t'] ?? 0,
		)
		const focused = buildFocusedWeights(['latin-e'], ['latin-t'], 1, 0.3)
		expect(focused['latin-e']).toBeGreaterThan(focused['latin-t'])
	})
})
