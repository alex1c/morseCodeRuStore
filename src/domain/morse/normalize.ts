/**
 * Text normalization before Morse encode.
 * Uppercases Latin and Cyrillic; never transliterates between scripts.
 */

export type NormalizeTextResult = {
	/** Normalized string ready for encode. */
	normalized: string
	/** Characters dropped because they are unsupported whitespace variants, etc. */
	dropped: string[]
}

const CYRILLIC_LOWER_TO_UPPER: Record<string, string> = {
	а: 'А',
	б: 'Б',
	в: 'В',
	г: 'Г',
	д: 'Д',
	е: 'Е',
	ё: 'Ё',
	ж: 'Ж',
	з: 'З',
	и: 'И',
	й: 'Й',
	к: 'К',
	л: 'Л',
	м: 'М',
	н: 'Н',
	о: 'О',
	п: 'П',
	р: 'Р',
	с: 'С',
	т: 'Т',
	у: 'У',
	ф: 'Ф',
	х: 'Х',
	ц: 'Ц',
	ч: 'Ч',
	ш: 'Ш',
	щ: 'Щ',
	ъ: 'Ъ',
	ы: 'Ы',
	ь: 'Ь',
	э: 'Э',
	ю: 'Ю',
	я: 'Я',
}

/**
 * Normalize an input Unicode string for Morse encoding.
 * - Latin a–z → A–Z
 * - Cyrillic lowercase → uppercase (ё → Ё preserved as distinct char)
 * - Spaces collapsed to single spaces (word separators)
 * - Supported punctuation kept as-is
 * - No RU ↔ LATIN transliteration
 */
export function normalizeText (text: string): NormalizeTextResult {
	const dropped: string[] = []
	let result = ''
	let previousWasSpace = false

	for (const raw of text) {
		let char = raw

		if (char >= 'a' && char <= 'z') {
			char = char.toUpperCase()
		} else if (CYRILLIC_LOWER_TO_UPPER[char]) {
			char = CYRILLIC_LOWER_TO_UPPER[char]
		}

		if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
			if (!previousWasSpace && result.length > 0) {
				result += ' '
				previousWasSpace = true
			} else if (char !== ' ') {
				dropped.push(raw)
			}
			continue
		}

		previousWasSpace = false
		result += char
	}

	// Trim trailing space introduced by trailing whitespace.
	if (result.endsWith(' ')) {
		result = result.slice(0, -1)
	}

	return { normalized: result, dropped }
}
