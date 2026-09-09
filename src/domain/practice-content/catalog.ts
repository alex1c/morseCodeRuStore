/**
 * Practice content catalog — words/phrases built from corpora.
 *
 * Ё policy (see YO_POLICY_NOTE): listening material never expects Ё as a
 * distinct answer. Corpus text is normalized Ё→Е, and requiredSymbolIds use
 * `ru-e` only — never `ru-yo`.
 */

import { getSymbolById } from '@/src/domain/morse'
import { LATIN_PHRASES, LATIN_WORDS } from './latin-corpus'
import { RU_PHRASES, RU_WORDS, YO_POLICY_NOTE } from './ru-corpus'
import {
	isItemEligible,
	normalizePracticeText,
	symbolCountOfText,
	textToRequiredSymbolIds,
} from './symbols'
import type {
	PracticeAlphabet,
	PracticeItem,
	WordLengthTier,
} from './types'

/** Re-export so callers can cite the listening Ё policy from the catalog. */
export { YO_POLICY_NOTE }

function difficultyForCount (symbolCount: number): number {
	if (symbolCount <= 2) {
		return 1
	}
	if (symbolCount <= 3) {
		return 2
	}
	if (symbolCount <= 5) {
		return 3
	}
	if (symbolCount <= 8) {
		return 4
	}
	return 5
}

/**
 * Build a PracticeItem from display text.
 * Digits are never required for pure word/phrase catalog entries.
 */
function buildItem (
	kind: 'word' | 'phrase',
	alphabet: PracticeAlphabet,
	rawText: string,
): PracticeItem {
	const text = normalizePracticeText(rawText, alphabet)
	const requiredSymbolIds = textToRequiredSymbolIds(text, alphabet, false)
	// Listening safety: strip any accidental ru-yo (Ё shares Morse with Е).
	const cleanedIds = requiredSymbolIds.map((id) =>
		id === 'ru-yo' ? 'ru-e' : id,
	)
	const symbolCount = symbolCountOfText(text)
	return {
		id: `${kind}:${alphabet}:${text}`,
		kind,
		alphabet,
		text,
		requiredSymbolIds: cleanedIds,
		symbolCount,
		difficulty: difficultyForCount(symbolCount),
	}
}

function buildWordCatalog (alphabet: PracticeAlphabet): PracticeItem[] {
	const source = alphabet === 'RU' ? RU_WORDS : LATIN_WORDS
	return source.map((word) => buildItem('word', alphabet, word))
}

function buildPhraseCatalog (alphabet: PracticeAlphabet): PracticeItem[] {
	const source = alphabet === 'RU' ? RU_PHRASES : LATIN_PHRASES
	return source.map((phrase) => buildItem('phrase', alphabet, phrase))
}

const WORD_CACHE: Record<PracticeAlphabet, PracticeItem[]> = {
	RU: buildWordCatalog('RU'),
	LATIN: buildWordCatalog('LATIN'),
}

const PHRASE_CACHE: Record<PracticeAlphabet, PracticeItem[]> = {
	RU: buildPhraseCatalog('RU'),
	LATIN: buildPhraseCatalog('LATIN'),
}

/** All word PracticeItems for the given alphabet. */
export function getWordItems (alphabet: PracticeAlphabet): PracticeItem[] {
	return WORD_CACHE[alphabet]
}

/** All phrase PracticeItems for the given alphabet. */
export function getPhraseItems (alphabet: PracticeAlphabet): PracticeItem[] {
	return PHRASE_CACHE[alphabet]
}

/** Keep only items whose every required symbol is unlocked. */
export function filterEligibleItems (
	items: PracticeItem[],
	allowedSymbolIds: Set<string> | string[],
): PracticeItem[] {
	const allowed = allowedSymbolIds instanceof Set
		? allowedSymbolIds
		: new Set(allowedSymbolIds)
	// Listening never unlocks via ru-yo — treat ru-e as covering Ё.
	if (allowed.has('ru-yo') && !allowed.has('ru-e')) {
		allowed.add('ru-e')
	}
	allowed.delete('ru-yo')
	return items.filter((item) =>
		isItemEligible(item.requiredSymbolIds, allowed),
	)
}

/**
 * Length tiers for word practice:
 * short = 2–3, medium = 4–5, long = 6+, mixed = any.
 */
export function wordMatchesLengthTier (
	item: PracticeItem,
	tier: WordLengthTier,
): boolean {
	const n = item.symbolCount
	switch (tier) {
		case 'short':
			return n >= 2 && n <= 3
		case 'medium':
			return n >= 4 && n <= 5
		case 'long':
			return n >= 6
		case 'mixed':
			return n >= 2
		default: {
			const _exhaustive: never = tier
			return _exhaustive
		}
	}
}

const RU_LETTER_RE = /^[А-Я ]+$/
const LATIN_LETTER_RE = /^[A-Z ]+$/

/**
 * Validate built-in corpora against catalog + purity rules.
 * Returns human-readable error strings (empty = healthy).
 */
export function validateCorpus (): string[] {
	const errors: string[] = []

	function checkList (
		label: string,
		alphabet: PracticeAlphabet,
		list: readonly string[],
		kind: 'word' | 'phrase',
	): void {
		const seen = new Set<string>()
		const purityRe = alphabet === 'RU' ? RU_LETTER_RE : LATIN_LETTER_RE

		for (const raw of list) {
			const normalized = normalizePracticeText(raw, alphabet)

			if (!normalized) {
				errors.push(`${label}: empty entry after normalize`)
				continue
			}

			if (raw.includes('Ё') || raw.includes('ё')) {
				errors.push(
					`${label}: Ё in listening corpus "${raw}" ` +
						`(${YO_POLICY_NOTE})`,
				)
			}

			if (!purityRe.test(normalized)) {
				errors.push(
					`${label}: alphabet impurity in "${raw}" ` +
						`(expected ${alphabet} letters` +
						`${kind === 'phrase' ? ' / spaces' : ''} only)`,
				)
			}

			if (seen.has(normalized)) {
				errors.push(`${label}: duplicate "${normalized}"`)
			}
			seen.add(normalized)

			try {
				const ids = textToRequiredSymbolIds(
					normalized,
					alphabet,
					false,
				)
				if (ids.length === 0) {
					errors.push(
						`${label}: empty requiredSymbolIds for "${normalized}"`,
					)
				}
				if (ids.includes('ru-yo')) {
					errors.push(
						`${label}: requiredSymbolIds contain ru-yo for ` +
							`"${normalized}"`,
					)
				}
				for (const id of ids) {
					if (!getSymbolById(id)) {
						errors.push(
							`${label}: missing catalog symbol ${id} ` +
								`in "${normalized}"`,
						)
					}
				}
			} catch (err) {
				const message = err instanceof Error
					? err.message
					: String(err)
				errors.push(
					`${label}: missing catalog char in "${normalized}" ` +
						`(${message})`,
				)
			}
		}
	}

	checkList('RU_WORDS', 'RU', RU_WORDS, 'word')
	checkList('RU_PHRASES', 'RU', RU_PHRASES, 'phrase')
	checkList('LATIN_WORDS', 'LATIN', LATIN_WORDS, 'word')
	checkList('LATIN_PHRASES', 'LATIN', LATIN_PHRASES, 'phrase')

	// Sanity: cached catalog items must not reference ru-yo.
	for (const alphabet of ['RU', 'LATIN'] as const) {
		for (const item of [
			...getWordItems(alphabet),
			...getPhraseItems(alphabet),
		]) {
			if (item.requiredSymbolIds.includes('ru-yo')) {
				errors.push(
					`catalog item ${item.id} requires ru-yo ` +
						`(violates ${YO_POLICY_NOTE})`,
				)
			}
			if (item.requiredSymbolIds.length === 0) {
				errors.push(`catalog item ${item.id} has empty requiredSymbolIds`)
			}
		}
	}

	return errors
}
