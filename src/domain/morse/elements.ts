/**
 * Serialization helpers for MorseElement ↔ classic "." / "-" patterns.
 */

import type { MorseElement } from './types'

/** Serialize elements to an ASCII Morse pattern (e.g. ".-"). */
export function sequenceToPattern (code: MorseElement[]): string {
	return code
		.map((element) => (element === 'dot' ? '.' : '-'))
		.join('')
}

/** Parse ASCII Morse pattern into elements. Invalid chars are skipped. */
export function patternToSequence (pattern: string): MorseElement[] {
	const elements: MorseElement[] = []
	for (const char of pattern) {
		if (char === '.' || char === '·') {
			elements.push('dot')
		} else if (char === '-' || char === '−' || char === '–') {
			elements.push('dash')
		}
	}
	return elements
}

/** Alias kept for call sites that still say "sequence". */
export const codeToPattern = sequenceToPattern
export const patternToCode = patternToSequence
