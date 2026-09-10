/**
 * Reference filter / search helpers (pure).
 */

import {
	listDigits,
	listLatinLetters,
	listPunctuation,
	listRussianLetters,
	sequenceToPattern,
	type MorseSymbol,
} from '@/src/domain/morse'

export type ReferenceSection = 'RU' | 'LATIN' | 'digits' | 'punctuation'

export function listReferenceSymbols (
	section: ReferenceSection,
): MorseSymbol[] {
	switch (section) {
		case 'RU':
			return listRussianLetters().filter((s) => !s.decodeAliasOfId)
		case 'LATIN':
			return listLatinLetters()
		case 'digits':
			return listDigits()
		case 'punctuation':
			return listPunctuation()
		default: {
			const _exhaustive: never = section
			return _exhaustive
		}
	}
}

/**
 * Filter by character or Morse pattern substring (case-insensitive).
 */
export function filterReferenceSymbols (
	symbols: MorseSymbol[],
	query: string,
): MorseSymbol[] {
	const q = query.trim().toUpperCase()
	if (!q) {
		return symbols
	}
	const morseQ = q.replace(/[·•]/g, '.').replace(/[—–]/g, '-')
	return symbols.filter((symbol) => {
		if (symbol.character.toUpperCase() === q) {
			return true
		}
		if (symbol.character.toUpperCase().includes(q) && q.length === 1) {
			return true
		}
		const pattern = sequenceToPattern(symbol.code)
		return pattern.includes(morseQ)
	})
}

/**
 * Find a Latin/RU letter with the same Morse pattern (for Reference detail).
 */
export function findEquivalentLetter (
	symbol: MorseSymbol,
): MorseSymbol | null {
	if (symbol.family !== 'RU' && symbol.family !== 'LATIN') {
		return null
	}
	const pattern = sequenceToPattern(symbol.code)
	const other =
		symbol.family === 'RU' ? listLatinLetters() : listRussianLetters()
	return (
		other.find(
			(item) =>
				!item.decodeAliasOfId &&
				sequenceToPattern(item.code) === pattern,
		) ?? null
	)
}
