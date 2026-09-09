/**
 * Directional confusion pairs — preserve A→B and B→A separately.
 */

import type { SymbolStatsMap } from '@/src/types'
import { getSymbolById } from '@/src/domain/morse'
import { MIN_CONFUSION_PAIR_COUNT } from './constants'
import type { ConfusionPair } from './types'

function alphabetFamily (alphabet: 'RU' | 'LATIN'): 'RU' | 'LATIN' {
	return alphabet
}

/**
 * Extract undirected pair rows with both directional counts.
 * Only includes pairs whose aggregate meets the minimum threshold.
 */
export function extractConfusionPairs (
	statsMap: SymbolStatsMap,
	alphabet: 'RU' | 'LATIN',
	minTotal: number = MIN_CONFUSION_PAIR_COUNT,
): ConfusionPair[] {
	const family = alphabetFamily(alphabet)
	const pairMap = new Map<string, ConfusionPair>()

	for (const [expectedId, stats] of Object.entries(statsMap)) {
		const expected = getSymbolById(expectedId)
		if (!expected || expected.family !== family) {
			continue
		}
		for (const [answerId, count] of Object.entries(stats.confusionMap)) {
			if (count <= 0) {
				continue
			}
			const answer = getSymbolById(answerId)
			if (!answer || answer.family !== family) {
				continue
			}
			const [a, b] =
				expectedId < answerId
					? [expectedId, answerId]
					: [answerId, expectedId]
			const key = `${a}|${b}`
			const existing = pairMap.get(key) ?? {
				symbolIdA: a,
				symbolIdB: b,
				aToB: 0,
				bToA: 0,
				total: 0,
			}
			if (expectedId === a && answerId === b) {
				existing.aToB += count
			} else {
				existing.bToA += count
			}
			existing.total = existing.aToB + existing.bToA
			pairMap.set(key, existing)
		}
	}

	return [...pairMap.values()]
		.filter((pair) => pair.total >= minTotal)
		.sort((left, right) => right.total - left.total)
}

export function getDirectionalConfusionCount (
	statsMap: SymbolStatsMap,
	expectedSymbolId: string,
	answerSymbolId: string,
): number {
	return statsMap[expectedSymbolId]?.confusionMap[answerSymbolId] ?? 0
}
