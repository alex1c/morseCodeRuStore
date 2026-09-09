/**
 * Receive generator / pool / no-repeat.
 */

import { createSeededRandom } from '@/src/domain'
import {
	generateReceiveQuestions,
	pickNextSymbol,
	resolveReceiveSymbolPool,
} from '@/src/features/receive'

describe('receive generator', () => {
	test('respects length, alphabet purity and pool', () => {
		const questions = generateReceiveQuestions({
			alphabet: 'RU',
			symbolPool: ['ru-a', 'ru-t', 'ru-n', 'latin-e'],
			sessionLength: 10,
			seed: 7,
		})
		expect(questions).toHaveLength(10)
		expect(
			questions.every((q) =>
				['ru-a', 'ru-t', 'ru-n'].includes(q.symbolId),
			),
		).toBe(true)
		expect(
			questions.every((q) => q.optionSymbolIds.includes(q.symbolId)),
		).toBe(true)
		expect(
			questions.every(
				(q) => new Set(q.optionSymbolIds).size === q.optionSymbolIds.length,
			),
		).toBe(true)
		expect(
			questions.every((q) =>
				q.optionSymbolIds.every((id) => id.startsWith('ru-')),
			),
		).toBe(true)
	})

	test('avoids immediate repetition when pool > 1', () => {
		const random = createSeededRandom(99)
		const pool = ['ru-a', 'ru-t', 'ru-n']
		let previous: string | null = null
		for (let i = 0; i < 30; i += 1) {
			const next = pickNextSymbol(pool, previous, random)
			if (previous != null) {
				expect(next).not.toBe(previous)
			}
			previous = next
		}
	})

	test('allows repetition for single-symbol pool', () => {
		const random = createSeededRandom(1)
		expect(pickNextSymbol(['ru-a'], 'ru-a', random)).toBe('ru-a')
	})

	test('fresh known fallback returns first course symbols', () => {
		const pool = resolveReceiveSymbolPool({
			alphabet: 'LATIN',
			preset: 'known',
			knownSymbolIds: [],
			customSymbolIds: [],
		})
		expect(pool.length).toBeGreaterThanOrEqual(2)
		expect(pool.every((id) => id.startsWith('latin-'))).toBe(true)
	})

	test('deterministic generation by seed', () => {
		const a = generateReceiveQuestions({
			alphabet: 'LATIN',
			symbolPool: ['latin-e', 'latin-t', 'latin-a', 'latin-n'],
			sessionLength: 20,
			seed: 42,
		})
		const b = generateReceiveQuestions({
			alphabet: 'LATIN',
			symbolPool: ['latin-e', 'latin-t', 'latin-a', 'latin-n'],
			sessionLength: 20,
			seed: 42,
		})
		expect(a.map((q) => q.symbolId)).toEqual(b.map((q) => q.symbolId))
	})
})
