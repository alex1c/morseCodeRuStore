/**
 * Map characters ↔ MorseSymbol ids for practice content.
 * Listening corpus never uses Ё as a distinct expected answer (same Morse as Е).
 */

import {
	getSymbolById,
	listDigits,
	listLatinLetters,
	listRussianLetters,
} from '@/src/domain/morse'
import type { PracticeAlphabet } from './types'

const ruByChar = new Map(
	listRussianLetters().map((symbol) => [symbol.character, symbol.id]),
)
const latinByChar = new Map(
	listLatinLetters().map((symbol) => [symbol.character, symbol.id]),
)
const digitByChar = new Map(
	listDigits().map((symbol) => [symbol.character, symbol.id]),
)

/**
 * Normalize listening text: upper-case, collapse spaces, Ё→Е for RU.
 */
export function normalizePracticeText (
	raw: string,
	alphabet: PracticeAlphabet,
): string {
	let text = raw.replace(/\s+/g, ' ').trim().toUpperCase()
	if (alphabet === 'RU') {
		text = text.replace(/Ё/g, 'Е')
	}
	return text
}

export function characterToSymbolId (
	character: string,
	alphabet: PracticeAlphabet,
	allowDigits = false,
): string | null {
	const ch = character.toUpperCase()
	if (ch === ' ') {
		return null
	}
	if (allowDigits || alphabet === 'LATIN' || alphabet === 'RU') {
		const digit = digitByChar.get(ch)
		if (digit && allowDigits) {
			return digit
		}
	}
	if (alphabet === 'RU') {
		const normalized = ch === 'Ё' ? 'Е' : ch
		return ruByChar.get(normalized) ?? null
	}
	return latinByChar.get(ch) ?? null
}

export function textToRequiredSymbolIds (
	text: string,
	alphabet: PracticeAlphabet,
	allowDigits = false,
): string[] {
	const normalized = normalizePracticeText(text, alphabet)
	const ids: string[] = []
	for (const ch of normalized) {
		if (ch === ' ') {
			continue
		}
		const id = characterToSymbolId(ch, alphabet, allowDigits)
		if (!id) {
			throw new Error(
				`Unsupported practice character "${ch}" for ${alphabet}`,
			)
		}
		ids.push(id)
	}
	return ids
}

export function isItemEligible (
	requiredSymbolIds: string[],
	allowedSymbolIds: Set<string> | string[],
): boolean {
	const allowed = allowedSymbolIds instanceof Set
		? allowedSymbolIds
		: new Set(allowedSymbolIds)
	return requiredSymbolIds.every((id) => allowed.has(id))
}

export function symbolCountOfText (text: string): number {
	return text.replace(/\s+/g, '').length
}

export function assertSymbolExists (symbolId: string): void {
	if (!getSymbolById(symbolId)) {
		throw new Error(`Unknown Morse symbol id: ${symbolId}`)
	}
}
