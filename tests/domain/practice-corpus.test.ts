/**
 * Corpus validation + eligibility + Ё policy.
 */

import {
	YO_POLICY_NOTE,
	filterEligibleItems,
	getPhraseItems,
	getWordItems,
	validateCorpus,
	wordMatchesLengthTier,
} from '@/src/domain/practice-content'
import { getSymbolById, sequenceToPattern } from '@/src/domain/morse'

describe('practice content corpus', () => {
	test('validateCorpus reports no errors', () => {
		expect(validateCorpus()).toEqual([])
	})

	test('RU and LATIN corpora have healthy sizes', () => {
		const ru = getWordItems('RU')
		const la = getWordItems('LATIN')
		expect(ru.length).toBeGreaterThanOrEqual(150)
		expect(la.length).toBeGreaterThanOrEqual(150)
		expect(getPhraseItems('RU').length).toBeGreaterThanOrEqual(20)
		expect(getPhraseItems('LATIN').length).toBeGreaterThanOrEqual(20)
	})

	test('requiredSymbolIds map to catalog and alphabet family', () => {
		for (const item of getWordItems('RU')) {
			expect(item.requiredSymbolIds.length).toBe(item.symbolCount)
			for (const id of item.requiredSymbolIds) {
				const symbol = getSymbolById(id)
				expect(symbol).toBeTruthy()
				expect(symbol?.family).toBe('RU')
				expect(id).not.toBe('ru-yo')
			}
			expect(item.text.includes('Ё')).toBe(false)
		}
		for (const item of getWordItems('LATIN')) {
			for (const id of item.requiredSymbolIds) {
				expect(getSymbolById(id)?.family).toBe('LATIN')
			}
			expect(/[А-ЯЁ]/.test(item.text)).toBe(false)
		}
	})

	test('Ё policy is documented and listening items use Е', () => {
		expect(YO_POLICY_NOTE.toLowerCase()).toContain('ё')
		const withE = getWordItems('RU').some((w) => w.text.includes('Е'))
		expect(withE).toBe(true)
	})

	test('eligibility excludes unknown symbols', () => {
		const known = new Set(['ru-d', 'ru-o', 'ru-m'])
		const eligible = filterEligibleItems(getWordItems('RU'), known)
		expect(eligible.every((item) =>
			item.requiredSymbolIds.every((id) => known.has(id)),
		)).toBe(true)
		expect(eligible.some((item) => item.text === 'ДОМ')).toBe(true)
		expect(eligible.some((item) => item.text.includes('Ж'))).toBe(false)
	})

	test('word length tiers', () => {
		const word = getWordItems('RU').find((w) => w.text === 'ДОМ')
		expect(word).toBeTruthy()
		expect(wordMatchesLengthTier(word!, 'short')).toBe(true)
		expect(wordMatchesLengthTier(word!, 'medium')).toBe(false)
		const long = getWordItems('RU').find((w) => w.symbolCount >= 6)
		expect(long && wordMatchesLengthTier(long, 'long')).toBe(true)
	})

	test('canonical digit patterns via catalog (not duplicated)', () => {
		const expected: Record<string, string> = {
			'digit-1': '.----',
			'digit-2': '..---',
			'digit-5': '.....',
			'digit-0': '-----',
		}
		for (const [id, pattern] of Object.entries(expected)) {
			const symbol = getSymbolById(id)
			expect(symbol).toBeTruthy()
			expect(sequenceToPattern(symbol!.code)).toBe(pattern)
		}
	})
})
