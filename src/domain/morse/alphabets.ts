/**
 * Indexed alphabet views over the canonical catalog.
 * Lookups are O(1) after module init — never rebuild maps per call.
 */

import { MORSE_CATALOG } from './catalog'
import { sequenceToPattern } from './elements'
import type {
	AlphabetContext,
	AlphabetFamily,
	MorseSymbol,
} from './types'

function isSharedFamily (family: AlphabetFamily): boolean {
	return family === 'DIGIT' || family === 'PUNCTUATION'
}

function familyAllowedInContext (
	family: AlphabetFamily,
	context: AlphabetContext,
): boolean {
	if (isSharedFamily(family)) {
		return true
	}
	if (context === 'BOTH') {
		return family === 'RU' || family === 'LATIN'
	}
	return family === context
}

/** All enabled symbols visible in a learner alphabet context. */
export function getSymbolsForContext (
	context: AlphabetContext,
): MorseSymbol[] {
	return MORSE_CATALOG.filter(
		(symbol) =>
			symbol.enabled && familyAllowedInContext(symbol.family, context),
	)
}

const byId = new Map<string, MorseSymbol>()
for (const symbol of MORSE_CATALOG) {
	byId.set(symbol.id, symbol)
}

/** Character → symbol maps per decode/encode primary context (RU / LATIN). */
function buildCharacterMap (
	primary: 'RU' | 'LATIN',
): Map<string, MorseSymbol> {
	const map = new Map<string, MorseSymbol>()
	for (const symbol of MORSE_CATALOG) {
		if (!symbol.enabled) {
			continue
		}
		if (
			symbol.family !== primary &&
			!isSharedFamily(symbol.family)
		) {
			continue
		}
		// First write wins; aliases like Ё are registered explicitly after Е.
		if (!map.has(symbol.character)) {
			map.set(symbol.character, symbol)
		}
	}
	return map
}

/**
 * Pattern → symbol for a primary alphabet.
 * Decode aliases (Ё) are skipped so `.` resolves to Е, not Ё.
 */
function buildPatternMap (
	primary: 'RU' | 'LATIN',
): Map<string, MorseSymbol> {
	const map = new Map<string, MorseSymbol>()
	for (const symbol of MORSE_CATALOG) {
		if (!symbol.enabled || symbol.decodeAliasOfId) {
			continue
		}
		if (
			symbol.family !== primary &&
			!isSharedFamily(symbol.family)
		) {
			continue
		}
		const pattern = sequenceToPattern(symbol.code)
		if (!map.has(pattern)) {
			map.set(pattern, symbol)
		}
	}
	return map
}

const characterMaps = {
	RU: buildCharacterMap('RU'),
	LATIN: buildCharacterMap('LATIN'),
} as const

const patternMaps = {
	RU: buildPatternMap('RU'),
	LATIN: buildPatternMap('LATIN'),
} as const

export function getSymbolById (id: string): MorseSymbol | undefined {
	return byId.get(id)
}

/**
 * Resolve a display character for encode within a context.
 * BOTH tries RU map then LATIN map (no silent transliteration).
 */
export function lookupSymbolForEncode (
	character: string,
	context: AlphabetContext,
): MorseSymbol | undefined {
	if (context === 'RU') {
		return characterMaps.RU.get(character)
	}
	if (context === 'LATIN') {
		return characterMaps.LATIN.get(character)
	}
	return (
		characterMaps.RU.get(character) ??
		characterMaps.LATIN.get(character)
	)
}

/**
 * Resolve a Morse pattern for decode within a primary alphabet.
 * BOTH is not valid here — caller must pick a primary to avoid silent collisions.
 */
export function lookupSymbolForDecode (
	pattern: string,
	primary: 'RU' | 'LATIN',
): MorseSymbol | undefined {
	return patternMaps[primary].get(pattern)
}

/**
 * Patterns that mean different letters in RU vs LATIN (for tests / diagnostics).
 */
export function findCrossAlphabetPatternCollisions (): {
	pattern: string
	ru: string
	latin: string
}[] {
	const collisions: { pattern: string; ru: string; latin: string }[] = []
	for (const [pattern, ruSymbol] of patternMaps.RU) {
		if (ruSymbol.family !== 'RU') {
			continue
		}
		const latinSymbol = patternMaps.LATIN.get(pattern)
		if (latinSymbol && latinSymbol.family === 'LATIN') {
			collisions.push({
				pattern,
				ru: ruSymbol.character,
				latin: latinSymbol.character,
			})
		}
	}
	return collisions
}

export function listLatinLetters (): MorseSymbol[] {
	return MORSE_CATALOG.filter(
		(s) => s.enabled && s.family === 'LATIN' && s.category === 'letter',
	)
}

export function listRussianLetters (): MorseSymbol[] {
	return MORSE_CATALOG.filter(
		(s) => s.enabled && s.family === 'RU' && s.category === 'letter',
	)
}

export function listDigits (): MorseSymbol[] {
	return MORSE_CATALOG.filter(
		(s) => s.enabled && s.family === 'DIGIT',
	)
}

export function listPunctuation (): MorseSymbol[] {
	return MORSE_CATALOG.filter(
		(s) => s.enabled && s.family === 'PUNCTUATION',
	)
}
