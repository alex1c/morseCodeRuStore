/**
 * Adaptive weakness / mastery scoring.
 */

import {
	evaluateSymbolMastery,
	getWeaknessReasons,
	MIN_ATTEMPTS_FOR_WEAKNESS,
	resetAdaptiveClockForTests,
	setAdaptiveClockForTests,
} from '@/src/domain'
import { createEmptySymbolStats } from '@/src/types'

const NOW = Date.parse('2026-09-09T12:00:00.000Z')

beforeEach(() => {
	setAdaptiveClockForTests({ nowMs: () => NOW })
})

afterEach(() => {
	resetAdaptiveClockForTests()
})

describe('adaptive weakness scoring', () => {
	test('high accuracy yields low weakness', () => {
		const stats = {
			...createEmptySymbolStats('ru-a'),
			attempts: 20,
			correct: 19,
			incorrect: 1,
			averageResponseTimeMs: 800,
			lastPracticedAt: '2026-09-09T10:00:00.000Z',
		}
		const mastery = evaluateSymbolMastery(stats, 'ru-a')
		expect(mastery.insufficientData).toBe(false)
		expect(mastery.weaknessScore).toBeLessThan(0.35)
		expect(mastery.tier === 'strong' || mastery.tier === 'stable').toBe(true)
	})

	test('low accuracy raises weakness', () => {
		const stats = {
			...createEmptySymbolStats('ru-zh'),
			attempts: 12,
			correct: 4,
			incorrect: 8,
			averageResponseTimeMs: 1200,
			lastPracticedAt: '2026-09-08T10:00:00.000Z',
			confusionMap: { 'ru-f': 7 },
		}
		const mastery = evaluateSymbolMastery(stats, 'ru-zh')
		expect(mastery.weaknessScore).toBeGreaterThan(0.4)
		expect(mastery.tier).toBe('weak')
	})

	test('confusion raises weakness vs clean errors', () => {
		const clean = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 10,
				correct: 5,
				incorrect: 5,
				averageResponseTimeMs: 1000,
				lastPracticedAt: '2026-09-08T10:00:00.000Z',
			},
			'ru-a',
		)
		const confused = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-zh'),
				attempts: 10,
				correct: 5,
				incorrect: 5,
				averageResponseTimeMs: 1000,
				lastPracticedAt: '2026-09-08T10:00:00.000Z',
				confusionMap: { 'ru-f': 5 },
			},
			'ru-zh',
		)
		expect(confused.weaknessScore).toBeGreaterThan(clean.weaknessScore)
	})

	test('slow response affects only after enough attempts', () => {
		const few = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 2,
				correct: 2,
				incorrect: 0,
				averageResponseTimeMs: 4000,
				lastPracticedAt: '2026-09-09T10:00:00.000Z',
			},
			'ru-a',
		)
		expect(few.insufficientData).toBe(true)
		expect(few.attempts).toBeLessThan(MIN_ATTEMPTS_FOR_WEAKNESS)

		const slow = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 8,
				correct: 7,
				incorrect: 1,
				averageResponseTimeMs: 3200,
				lastPracticedAt: '2026-09-09T10:00:00.000Z',
			},
			'ru-a',
		)
		const fast = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-t'),
				attempts: 8,
				correct: 7,
				incorrect: 1,
				averageResponseTimeMs: 700,
				lastPracticedAt: '2026-09-09T10:00:00.000Z',
			},
			'ru-t',
		)
		expect(slow.weaknessScore).toBeGreaterThan(fast.weaknessScore)
	})

	test('recency penalty increases after long gap', () => {
		const fresh = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 10,
				correct: 8,
				incorrect: 2,
				averageResponseTimeMs: 1000,
				lastPracticedAt: '2026-09-09T08:00:00.000Z',
			},
			'ru-a',
		)
		const stale = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 10,
				correct: 8,
				incorrect: 2,
				averageResponseTimeMs: 1000,
				lastPracticedAt: '2026-08-01T08:00:00.000Z',
			},
			'ru-a',
		)
		expect(stale.weaknessScore).toBeGreaterThan(fresh.weaknessScore)
	})

	test('insufficient data is not labeled weak', () => {
		const mastery = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 1,
				correct: 0,
				incorrect: 1,
				averageResponseTimeMs: 2000,
				lastPracticedAt: '2026-09-09T08:00:00.000Z',
			},
			'ru-a',
		)
		expect(mastery.insufficientData).toBe(true)
		expect(mastery.tier).not.toBe('weak')
		expect(getWeaknessReasons(mastery)[0]?.kind).toBe('insufficientData')
	})

	test('paper-like zero average response does not invent slow penalty', () => {
		const mastery = evaluateSymbolMastery(
			{
				...createEmptySymbolStats('ru-a'),
				attempts: 6,
				correct: 5,
				incorrect: 1,
				averageResponseTimeMs: 0,
				lastPracticedAt: '2026-09-09T08:00:00.000Z',
			},
			'ru-a',
		)
		expect(
			mastery.reasons.every((reason) => reason.kind !== 'slowResponse'),
		).toBe(true)
	})
})
