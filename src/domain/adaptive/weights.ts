/**
 * Adaptive weight maps for weighted question selection.
 */

import type { AdaptiveWeightMap, SymbolMastery } from './types'
import { MIN_REVIEW_WEIGHT } from './constants'

/**
 * Build weights from mastery: weak → higher weight, strong keep a floor.
 */
export function buildAdaptiveWeights (
	masteryList: SymbolMastery[],
): AdaptiveWeightMap {
	const weights: AdaptiveWeightMap = {}
	for (const item of masteryList) {
		const raw = 0.15 + item.weaknessScore * 0.85
		const withFloor = Math.max(MIN_REVIEW_WEIGHT, raw)
		weights[item.symbolId] = Number.isFinite(withFloor)
			? withFloor
			: MIN_REVIEW_WEIGHT
	}
	return normalizeWeightMap(weights)
}

/**
 * Focused weights: elevate targets, keep distractors at lower weight.
 */
export function buildFocusedWeights (
	targetIds: string[],
	distractorIds: string[],
	targetWeight = 1,
	distractorWeight = 0.35,
): AdaptiveWeightMap {
	const weights: AdaptiveWeightMap = {}
	for (const id of distractorIds) {
		weights[id] = distractorWeight
	}
	for (const id of targetIds) {
		weights[id] = targetWeight
	}
	return normalizeWeightMap(weights)
}

export function normalizeWeightMap (
	weights: AdaptiveWeightMap,
): AdaptiveWeightMap {
	const cleaned: AdaptiveWeightMap = {}
	let sum = 0
	for (const [id, value] of Object.entries(weights)) {
		if (!Number.isFinite(value) || value <= 0) {
			continue
		}
		cleaned[id] = value
		sum += value
	}
	if (sum <= 0) {
		const ids = Object.keys(weights)
		const even = ids.length > 0 ? 1 / ids.length : 0
		const fallback: AdaptiveWeightMap = {}
		for (const id of ids) {
			fallback[id] = even
		}
		return fallback
	}
	const normalized: AdaptiveWeightMap = {}
	for (const [id, value] of Object.entries(cleaned)) {
		normalized[id] = value / sum
	}
	return normalized
}

export function assertWeightsValid (weights: AdaptiveWeightMap): boolean {
	const values = Object.values(weights)
	if (values.length === 0) {
		return false
	}
	return values.every(
		(value) => Number.isFinite(value) && value > 0 && !Number.isNaN(value),
	)
}
