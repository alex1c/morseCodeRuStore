/**
 * Quick Practice launch plan: adaptive vs balanced fallback.
 */

import {
	buildAdaptiveSessionPool,
	hasEnoughAdaptiveData,
	resetAdaptiveClockForTests,
	setAdaptiveClockForTests,
} from '@/src/domain'
import { resolveReceiveSymbolPool } from '@/src/features/receive'
import { createEmptySymbolStats, type SymbolStatsMap } from '@/src/types'

const NOW = Date.parse('2026-09-09T12:00:00.000Z')

beforeEach(() => {
	setAdaptiveClockForTests({ nowMs: () => NOW })
})
afterEach(() => {
	resetAdaptiveClockForTests()
})

describe('quick practice planning', () => {
	test('new user falls back to known/balanced pool', () => {
		expect(hasEnoughAdaptiveData({}, 'RU')).toBe(false)
		const pool = resolveReceiveSymbolPool({
			alphabet: 'RU',
			preset: 'known',
			knownSymbolIds: [],
			customSymbolIds: [],
		})
		expect(pool.symbolIds.length).toBeGreaterThanOrEqual(2)
	})

	test('enough stats uses adaptive pool with weights', () => {
		const map: SymbolStatsMap = {
			'ru-zh': {
				...createEmptySymbolStats('ru-zh'),
				attempts: 8,
				correct: 2,
				incorrect: 6,
				lastPracticedAt: '2026-09-01T00:00:00.000Z',
				confusionMap: { 'ru-f': 4 },
			},
			'ru-f': {
				...createEmptySymbolStats('ru-f'),
				attempts: 7,
				correct: 2,
				incorrect: 5,
				lastPracticedAt: '2026-09-01T00:00:00.000Z',
			},
		}
		expect(hasEnoughAdaptiveData(map, 'RU')).toBe(true)
		const plan = buildAdaptiveSessionPool({
			statsMap: map,
			alphabet: 'RU',
			knownSymbolIds: ['ru-a', 'ru-t', 'ru-zh', 'ru-f'],
		})
		expect(plan.hasEnoughData).toBe(true)
		expect(plan.symbolIds.length).toBeGreaterThan(0)
		expect(Object.keys(plan.weights).length).toBeGreaterThan(0)
	})
})
