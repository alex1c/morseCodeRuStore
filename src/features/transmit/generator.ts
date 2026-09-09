/**
 * Transmit question generator — uses transmit-owned weak stats when available.
 */

import {
	createSeededRandom,
	getCourseById,
	getSymbolById,
} from '@/src/domain'
import { pickNextSymbol } from '@/src/features/receive'
import type {
	TransmitAlphabet,
	TransmitQuestion,
	TransmitSessionLength,
	TransmitSymbolPreset,
	TransmitSymbolStatsMap,
} from './types'

export type GenerateTransmitSessionInput = {
	alphabet: TransmitAlphabet
	symbolPool: string[]
	sessionLength: TransmitSessionLength
	seed: number
	weights?: Record<string, number>
}

function courseIds (alphabet: TransmitAlphabet): string[] {
	const courseId = alphabet === 'RU' ? 'ru-main' : 'latin-main'
	const lessons = getCourseById(courseId)?.lessons ?? []
	return [...new Set(
		lessons.flatMap((lesson) => [
			...lesson.newSymbolIds,
			...lesson.reviewSymbolIds,
		]),
	)].filter((id) => getSymbolById(id)?.family === alphabet)
}

export function resolveTransmitSymbolPool (input: {
	alphabet: TransmitAlphabet
	preset: TransmitSymbolPreset
	knownSymbolIds: string[]
	customSymbolIds: string[]
	transmitStats?: TransmitSymbolStatsMap
}): string[] {
	const available = courseIds(input.alphabet)
	if (input.preset === 'custom') {
		return input.customSymbolIds.filter(
			(id) => getSymbolById(id)?.family === input.alphabet,
		)
	}
	if (input.preset === 'all-available') {
		return available
	}
	if (input.preset === 'weak') {
		const stats = input.transmitStats ?? {}
		const weak = Object.values(stats)
			.filter((item) => {
				const symbol = getSymbolById(item.symbolId)
				if (!symbol || symbol.family !== input.alphabet) {
					return false
				}
				if (item.attempts < 3) {
					return false
				}
				const accuracy =
					item.attempts <= 0
						? 0
						: item.correct / item.attempts
				return accuracy < 0.75
			})
			.sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
			.map((item) => item.symbolId)
		if (weak.length >= 2) {
			const known = input.knownSymbolIds.filter((id) =>
				available.includes(id),
			)
			return [...new Set([...weak, ...known])].slice(0, 8)
		}
		const known = input.knownSymbolIds.filter((id) =>
			available.includes(id),
		)
		return known.length > 0 ? known : available.slice(0, 2)
	}
	const known = input.knownSymbolIds.filter((id) => available.includes(id))
	return known.length > 0 ? known : available.slice(0, 2)
}

export function generateTransmitQuestions (
	input: GenerateTransmitSessionInput,
): TransmitQuestion[] {
	const pool = [...new Set(input.symbolPool)].filter(
		(id) => getSymbolById(id)?.family === input.alphabet,
	)
	if (pool.length === 0) {
		return []
	}
	const random = createSeededRandom(input.seed)
	const questions: TransmitQuestion[] = []
	let previous: string | null = null
	for (let i = 0; i < input.sessionLength; i += 1) {
		let symbolId: string
		if (input.weights && Object.keys(input.weights).length > 0) {
			const candidates = previous
				? pool.filter((id) => id !== previous)
				: pool
			const source = candidates.length > 0 ? candidates : pool
			let sum = 0
			for (const id of source) {
				const weight = input.weights[id]
				sum += Number.isFinite(weight) && (weight as number) > 0
					? (weight as number)
					: 1
			}
			let cursor = random.next() * sum
			symbolId = source[source.length - 1]
			for (const id of source) {
				const weight = input.weights[id]
				cursor -= Number.isFinite(weight) && (weight as number) > 0
					? (weight as number)
					: 1
				if (cursor <= 0) {
					symbolId = id
					break
				}
			}
		} else {
			symbolId = pickNextSymbol(pool, previous, random)
		}
		previous = symbolId
		questions.push({
			id: `transmit-${i + 1}`,
			symbolId,
		})
	}
	return questions
}

/**
 * Focused retry pool: error symbols + a few contrast distractors.
 */
export function buildTransmitErrorFocusPool (
	errorSymbolIds: string[],
	alphabet: TransmitAlphabet,
	knownSymbolIds: string[],
): { symbolIds: string[]; weights: Record<string, number> } {
	const targets = [...new Set(errorSymbolIds)].filter(
		(id) => getSymbolById(id)?.family === alphabet,
	)
	const distractors = [
		...knownSymbolIds,
		...courseIds(alphabet),
	]
		.filter((id) => getSymbolById(id)?.family === alphabet)
		.filter((id) => !targets.includes(id))
		.slice(0, 3)
	const symbolIds = [...targets, ...distractors]
	const weights: Record<string, number> = {}
	for (const id of distractors) {
		weights[id] = 0.3
	}
	for (const id of targets) {
		weights[id] = 1
	}
	return { symbolIds, weights }
}
