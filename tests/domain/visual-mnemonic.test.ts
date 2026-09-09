import {
	getSymbolById,
	getVisualMnemonicBySymbolId,
	listLatinLetters,
	listRussianLetters,
} from '@/src/domain'

describe('visual mnemonic mapping', () => {
	test('mnemonics reference existing Morse symbols', () => {
		const sampleIds = ['ru-a', 'ru-t', 'ru-n', 'latin-e', 'latin-t', 'latin-a']
		for (const id of sampleIds) {
			const mnemonic = getVisualMnemonicBySymbolId(id)
			expect(mnemonic).toBeDefined()
			const symbol = getSymbolById(mnemonic!.symbolId)
			expect(symbol).toBeDefined()
			expect(symbol?.visualMnemonicId).toBe(mnemonic?.id)
		}
	})

	test('animation element count matches Morse code length for mapped symbols', () => {
		const ids = ['ru-a', 'ru-t', 'ru-n', 'ru-o', 'ru-i', 'latin-e', 'latin-t']
		for (const id of ids) {
			const mnemonic = getVisualMnemonicBySymbolId(id)
			const symbol = getSymbolById(id)
			expect(mnemonic?.elements.length).toBe(symbol?.code.length)
		}
	})

	test('fallback is available for symbols without custom mnemonic', () => {
		const ruExtra = listRussianLetters().find(
			(item) => getVisualMnemonicBySymbolId(item.id) == null,
		)
		const latinExtra = listLatinLetters().find(
			(item) => getVisualMnemonicBySymbolId(item.id) == null,
		)
		expect(ruExtra).toBeDefined()
		expect(latinExtra).toBeDefined()
	})
})
