/**
 * Reference section lists and search.
 */

import {
	filterReferenceSymbols,
	findEquivalentLetter,
	listReferenceSymbols,
} from '@/src/features/reference'
import { getSymbolById, sequenceToPattern } from '@/src/domain/morse'
import { getVisualMnemonicBySymbolId } from '@/src/domain/visual-mnemonic'

describe('reference helpers', () => {
	test('category counts', () => {
		expect(listReferenceSymbols('RU').length).toBeGreaterThanOrEqual(32)
		expect(listReferenceSymbols('LATIN')).toHaveLength(26)
		expect(listReferenceSymbols('digits')).toHaveLength(10)
		expect(listReferenceSymbols('punctuation').length).toBeGreaterThanOrEqual(10)
	})

	test('filter by alphabet isolation', () => {
		for (const symbol of listReferenceSymbols('RU')) {
			expect(symbol.family).toBe('RU')
		}
		for (const symbol of listReferenceSymbols('digits')) {
			expect(symbol.family).toBe('DIGIT')
		}
	})

	test('search by character and Morse pattern', () => {
		const ru = listReferenceSymbols('RU')
		expect(filterReferenceSymbols(ru, 'Ж').some((s) => s.character === 'Ж')).toBe(
			true,
		)
		const zh = getSymbolById('ru-zh')!
		const byPattern = filterReferenceSymbols(
			ru,
			sequenceToPattern(zh.code),
		)
		expect(byPattern.some((s) => s.id === 'ru-zh')).toBe(true)
	})

	test('mnemonic coverage for RU primary letters (Ъ optional)', () => {
		const ru = listReferenceSymbols('RU')
		const withCard = ru.filter((s) => getVisualMnemonicBySymbolId(s.id))
		expect(withCard.length).toBeGreaterThanOrEqual(28)
		expect(getVisualMnemonicBySymbolId('ru-hard')).toBeUndefined()
	})

	test('equivalent cross-alphabet letter', () => {
		const a = getSymbolById('ru-a')!
		const latin = findEquivalentLetter(a)
		expect(latin?.character).toBe('A')
	})
})
