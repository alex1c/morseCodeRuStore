/**
 * Receive session question generator — independent from lesson curriculum.
 */

import {
	createSeededRandom,
	generateQuestionOptions,
	getCourseById,
	getSymbolById,
	type RandomLike,
} from '@/src/domain'
import type {
	ReceiveAlphabet,
	ReceiveQuestion,
	ReceiveSessionLength,
} from './types'

export type GenerateReceiveSessionInput = {
	alphabet: ReceiveAlphabet
	symbolPool: string[]
	sessionLength: ReceiveSessionLength
	seed: number
	/** Finite fallback when infinite is requested for preview/tests. */
	infinitePreviewLength?: number
}

function resolveLength (length: ReceiveSessionLength, preview = 30): number {
	if (length === 'infinite') {
		return preview
	}
	return length
}

/**
 * Build a finite question list. Infinite sessions regenerate on demand.
 */
export function generateReceiveQuestions (
	input: GenerateReceiveSessionInput,
): ReceiveQuestion[] {
	const pool = [...new Set(input.symbolPool)].filter((id) => {
		const symbol = getSymbolById(id)
		if (!symbol) {
			return false
		}
		return input.alphabet === 'RU'
			? symbol.family === 'RU'
			: symbol.family === 'LATIN'
	})
	if (pool.length === 0) {
		return []
	}
	const optionPool = expandReceiveOptionPool(input.alphabet, pool)
	const random = createSeededRandom(input.seed)
	const count = resolveLength(
		input.sessionLength,
		input.infinitePreviewLength ?? 30,
	)
	const questions: ReceiveQuestion[] = []
	let previous: string | null = null
	for (let i = 0; i < count; i += 1) {
		const symbolId = pickNextSymbol(pool, previous, random)
		previous = symbolId
		questions.push({
			id: `receive-${i + 1}`,
			symbolId,
			optionSymbolIds: generateQuestionOptions(
				symbolId,
				optionPool,
				random,
			),
		})
	}
	return questions
}

export function pickNextSymbol (
	pool: string[],
	previous: string | null,
	random: RandomLike,
): string {
	if (pool.length === 1) {
		return pool[0]
	}
	const candidates = previous
		? pool.filter((id) => id !== previous)
		: pool
	const source = candidates.length > 0 ? candidates : pool
	return source[Math.floor(random.next() * source.length)]
}

/**
 * Expand a practice pool with same-alphabet course fillers for 4-choice options.
 */
export function expandReceiveOptionPool (
	alphabet: ReceiveAlphabet,
	practicePool: string[],
): string[] {
	const courseId = alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const coursePool =
		getCourseById(courseId)?.lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]) ?? []
	return [...new Set([...practicePool, ...coursePool])].filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === alphabet
	})
}

/**
 * Resolve the practical symbol pool for Receive setup.
 */
export function resolveReceiveSymbolPool (input: {
	alphabet: ReceiveAlphabet
	preset: 'known' | 'weak' | 'all-available' | 'custom'
	knownSymbolIds: string[]
	customSymbolIds: string[]
}): string[] {
	const courseId = input.alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const course = getCourseById(courseId)
	const available =
		course?.lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]) ?? []
	const uniqueAvailable = [...new Set(available)].filter((id) => {
		const symbol = getSymbolById(id)
		return symbol?.family === input.alphabet
	})

	if (input.preset === 'custom') {
		return input.customSymbolIds.filter((id) =>
			uniqueAvailable.includes(id) ||
			getSymbolById(id)?.family === input.alphabet,
		)
	}
	if (input.preset === 'all-available') {
		return uniqueAvailable
	}
	if (input.preset === 'weak') {
		// Phase 5 placeholder — fall back to known/available.
		const known = input.knownSymbolIds.filter((id) =>
			uniqueAvailable.includes(id),
		)
		return known.length > 0 ? known : uniqueAvailable.slice(0, 2)
	}
	const known = input.knownSymbolIds.filter((id) =>
		uniqueAvailable.includes(id),
	)
	if (known.length > 0) {
		return known
	}
	// Fresh learner fallback: first two course symbols.
	return uniqueAvailable.slice(0, 2)
}
