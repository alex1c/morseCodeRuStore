/**
 * Simplify Morse pattern validation helpers.
 */

import { MORSE_CATALOG } from './catalog'
import { patternToSequence } from './elements'
import type { MorseElement } from './types'

/** True when every element is a strict MorseElement. */
export function isValidMorseCode (code: MorseElement[]): boolean {
	if (code.length === 0) {
		return false
	}
	return code.every(
		(element) => element === 'dot' || element === 'dash',
	)
}

/** True when pattern contains only Morse dots/dashes. */
export function isValidMorsePattern (pattern: string): boolean {
	if (!pattern) {
		return false
	}
	for (const char of pattern) {
		if (
			char !== '.' &&
			char !== '-' &&
			char !== '·' &&
			char !== '−' &&
			char !== '–'
		) {
			return false
		}
	}
	return patternToSequence(pattern).length > 0
}

/**
 * Detect duplicate ids or duplicate (family, character) pairs in the catalog.
 * Returns human-readable issues (empty = healthy).
 */
export function validateCatalogIntegrity (): string[] {
	const issues: string[] = []
	const ids = new Set<string>()
	const familyChar = new Set<string>()

	for (const symbol of MORSE_CATALOG) {
		if (ids.has(symbol.id)) {
			issues.push(`Duplicate id: ${symbol.id}`)
		}
		ids.add(symbol.id)

		const key = `${symbol.family}:${symbol.character}`
		if (familyChar.has(key)) {
			issues.push(`Duplicate character in family: ${key}`)
		}
		familyChar.add(key)

		if (!isValidMorseCode(symbol.code)) {
			issues.push(`Invalid code for ${symbol.id}`)
		}
	}

	return issues
}
