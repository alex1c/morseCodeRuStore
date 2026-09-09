/**
 * Group / word / digit generators.
 */

import {
	buildPracticeSessionPlan,
	generateDigitGroup,
	generateRandomGroup,
	pickWords,
} from '@/src/domain/practice-content'
import { getSymbolById, listDigits } from '@/src/domain/morse'

const RU_POOL = [
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

describe('practice generators', () => {
	test('random group length, pool-only, deterministic', () => {
		const a = generateRandomGroup({
			alphabet: 'RU',
			poolSymbolIds: RU_POOL,
			length: 3,
			seed: 42,
		})
		const b = generateRandomGroup({
			alphabet: 'RU',
			poolSymbolIds: RU_POOL,
			length: 3,
			seed: 42,
		})
		expect(a.text).toBe(b.text)
		expect(a.symbolCount).toBe(3)
		expect(a.kind).toBe('group')
		expect(a.requiredSymbolIds.every((id) => RU_POOL.includes(id))).toBe(
			true,
		)
		expect(/[A-Z]/.test(a.text)).toBe(false)
	})

	test('adaptive weights bias toward weak symbols', () => {
		const weak = 'ru-zh'
		const pool = [...RU_POOL, weak]
		const weights = Object.fromEntries(
			pool.map((id) => [id, id === weak ? 50 : 1]),
		)
		let weakHits = 0
		const samples = 80
		for (let i = 0; i < samples; i += 1) {
			const item = generateRandomGroup({
				alphabet: 'RU',
				poolSymbolIds: pool,
				length: 4,
				seed: 1000 + i,
				weights,
				cooldownN: 2,
			})
			weakHits += item.requiredSymbolIds.filter((id) => id === weak)
				.length
		}
		// Uniform expectation ~ samples*4/poolSize ≈ 25; weighted should be higher.
		expect(weakHits).toBeGreaterThan(35)
	})

	test('group avoids excessive same-symbol runs when pool allows', () => {
		const item = generateRandomGroup({
			alphabet: 'RU',
			poolSymbolIds: RU_POOL,
			length: 5,
			seed: 7,
			cooldownN: 2,
		})
		const chars = item.text.split('')
		let maxRun = 1
		let run = 1
		for (let i = 1; i < chars.length; i += 1) {
			if (chars[i] === chars[i - 1]) {
				run += 1
				maxRun = Math.max(maxRun, run)
			} else {
				run = 1
			}
		}
		expect(maxRun).toBeLessThan(4)
	})

	test('word generator filters known symbols and length', () => {
		const known = new Set(RU_POOL)
		const words = pickWords({
			alphabet: 'RU',
			allowedSymbolIds: [...known],
			tier: 'short',
			count: 10,
			seed: 99,
		})
		expect(words.length).toBe(10)
		for (const word of words) {
			expect(word.symbolCount).toBeGreaterThanOrEqual(2)
			expect(word.symbolCount).toBeLessThanOrEqual(3)
			expect(
				word.requiredSymbolIds.every((id) => known.has(id)),
			).toBe(true)
		}
		const again = pickWords({
			alphabet: 'RU',
			allowedSymbolIds: [...known],
			tier: 'short',
			count: 10,
			seed: 99,
		})
		expect(again.map((w) => w.text)).toEqual(words.map((w) => w.text))
	})

	test('unavailable words excluded; unknown letter never appears', () => {
		const tiny = ['ru-a', 'ru-t', 'ru-n', 'ru-o']
		const words = pickWords({
			alphabet: 'RU',
			allowedSymbolIds: tiny,
			tier: 'mixed',
			count: 20,
			seed: 3,
		})
		expect(words.length).toBeGreaterThan(0)
		expect(words.every((w) =>
			w.requiredSymbolIds.every((id) => tiny.includes(id)),
		)).toBe(true)
	})

	test('digit groups lengths 1–5, digits only, deterministic', () => {
		const digitIds = new Set(listDigits().map((d) => d.id))
		for (const length of [1, 2, 3, 4, 5] as const) {
			const a = generateDigitGroup({
				length,
				seed: 55,
				alphabet: 'RU',
			})
			const b = generateDigitGroup({
				length,
				seed: 55,
				alphabet: 'RU',
			})
			expect(a.text).toBe(b.text)
			expect(a.text).toHaveLength(length)
			expect(/^\d+$/.test(a.text)).toBe(true)
			expect(a.kind).toBe('digits')
			expect(
				a.requiredSymbolIds.every((id) => digitIds.has(id)),
			).toBe(true)
		}
	})

	test('session plan phrases block when ineligible', () => {
		const plan = buildPracticeSessionPlan({
			contentKind: 'phrase',
			alphabet: 'RU',
			allowedSymbolIds: ['ru-a', 'ru-t'],
			seed: 1,
			sessionLength: 5,
		})
		expect(plan.items).toEqual([])
		expect(plan.blockedReason).toMatch(/Фразы/)
	})

	test('digit symbols resolve from catalog characters', () => {
		const item = generateDigitGroup({ length: 3, seed: 1, alphabet: 'LATIN' })
		for (const id of item.requiredSymbolIds) {
			expect(getSymbolById(id)?.family).toBe('DIGIT')
		}
	})
})
