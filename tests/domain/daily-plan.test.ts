/**
 * Deterministic Daily plan generation.
 */

import {
	addLocalDays,
	buildDailyPlan,
	dailySeedFor,
} from '@/src/domain/daily'
import { getSymbolById } from '@/src/domain/morse'

const KNOWN = [
	'ru-a',
	'ru-t',
	'ru-n',
	'ru-o',
	'ru-i',
	'ru-s',
	'ru-r',
	'ru-v',
	'ru-k',
	'ru-m',
	'ru-d',
	'ru-u',
]

describe('daily plan', () => {
	test('same date + same progress → same seed and plan shape', () => {
		const a = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: KNOWN,
			statsMap: {},
		})
		const b = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: KNOWN,
			statsMap: {},
		})
		expect(a.seed).toBe(b.seed)
		expect(a.totalItems).toBe(b.totalItems)
		expect(a.segments).toEqual(b.segments)
		expect(a.seed).toBe(dailySeedFor('2026-09-10', 'RU', KNOWN))
	})

	test('next date → different seed', () => {
		const today = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: KNOWN,
			statsMap: {},
		})
		const tomorrow = buildDailyPlan({
			dateKey: addLocalDays('2026-09-10', 1),
			alphabet: 'RU',
			knownSymbolIds: KNOWN,
			statsMap: {},
		})
		expect(tomorrow.seed).not.toBe(today.seed)
	})

	test('only eligible alphabet letters in pools', () => {
		const plan = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: KNOWN,
			statsMap: {},
		})
		for (const segment of plan.segments) {
			for (const id of segment.symbolPool) {
				const symbol = getSymbolById(id)
				expect(symbol?.family).toBe('RU')
			}
		}
	})

	test('beginner uses symbols + short groups', () => {
		const plan = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: ['ru-a', 'ru-t', 'ru-n', 'ru-o'],
			statsMap: {},
			targetItems: 40,
		})
		expect(plan.level).toBe('beginner')
		const kinds = plan.segments.map((s) => s.kind)
		expect(kinds).toContain('symbol')
		expect(kinds).toContain('group')
		expect(kinds).not.toContain('phrase')
	})

	test('advanced unlocks richer mix when progress allows', () => {
		const many = [
			...KNOWN,
			'ru-e',
			'ru-l',
			'ru-p',
			'ru-b',
			'ru-v',
			'ru-g',
			'ru-zh',
			'ru-z',
		]
		const plan = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'RU',
			knownSymbolIds: many,
			statsMap: {},
			hasEligiblePhrases: true,
			digitsUnlocked: true,
			targetItems: 48,
		})
		expect(plan.level).toBe('advanced')
		const kinds = new Set(plan.segments.map((s) => s.kind))
		expect(kinds.has('group')).toBe(true)
	})

	test('LATIN isolation', () => {
		const plan = buildDailyPlan({
			dateKey: '2026-09-10',
			alphabet: 'LATIN',
			knownSymbolIds: [
				'latin-e',
				'latin-t',
				'latin-a',
				'latin-n',
				'latin-o',
				'latin-i',
			],
			statsMap: {},
		})
		expect(plan.alphabet).toBe('LATIN')
		for (const segment of plan.segments) {
			for (const id of segment.symbolPool) {
				expect(getSymbolById(id)?.family).toBe('LATIN')
			}
		}
	})
})
