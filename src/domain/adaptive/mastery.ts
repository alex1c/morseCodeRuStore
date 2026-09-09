/**
 * Mastery tier + weakness scoring from SymbolStats.
 */

import { calculateAccuracyPercent } from '@/src/domain/morse'
import { createEmptySymbolStats, type SymbolStats } from '@/src/types'
import {
	MASTERY_THRESHOLDS,
	MIN_ATTEMPTS_FOR_RESPONSE_TIME,
	MIN_ATTEMPTS_FOR_WEAKNESS,
	RECENCY_DAYS,
	RESPONSE_TIME_BASELINE_MS,
	RESPONSE_TIME_FAST_MS,
	RESPONSE_TIME_SLOW_MS,
} from './constants'
import { daysBetween, getAdaptiveNowMs } from './clock'
import type {
	MasteryLabelKey,
	MasteryTier,
	SymbolMastery,
	WeaknessReason,
} from './types'

function clamp01 (value: number): number {
	if (!Number.isFinite(value)) {
		return 0
	}
	return Math.max(0, Math.min(1, value))
}

function topConfusionEntry (
	stats: SymbolStats,
): { answerSymbolId: string; count: number } | null {
	let best: { answerSymbolId: string; count: number } | null = null
	for (const [answerSymbolId, count] of Object.entries(stats.confusionMap)) {
		if (count <= 0) {
			continue
		}
		if (!best || count > best.count) {
			best = { answerSymbolId, count }
		}
	}
	return best
}

function accuracyComponent (accuracyPercent: number, incorrect: number): number {
	const missRate = clamp01(1 - accuracyPercent / 100)
	const incorrectBoost = clamp01(incorrect / 12)
	return clamp01(missRate * 0.75 + incorrectBoost * 0.25)
}

function confusionComponent (stats: SymbolStats): number {
	const totalConfused = Object.values(stats.confusionMap).reduce(
		(sum, n) => sum + n,
		0,
	)
	if (stats.attempts <= 0) {
		return 0
	}
	return clamp01(totalConfused / Math.max(stats.attempts, 1))
}

function responseTimeComponent (stats: SymbolStats): number {
	if (
		stats.attempts < MIN_ATTEMPTS_FOR_RESPONSE_TIME ||
		stats.averageResponseTimeMs <= 0
	) {
		return 0
	}
	const ms = stats.averageResponseTimeMs
	if (ms <= RESPONSE_TIME_FAST_MS) {
		return 0
	}
	if (ms >= RESPONSE_TIME_SLOW_MS) {
		return 1
	}
	return clamp01(
		(ms - RESPONSE_TIME_BASELINE_MS) /
			(RESPONSE_TIME_SLOW_MS - RESPONSE_TIME_FAST_MS),
	)
}

function recencyComponent (days: number | null): number {
	if (days == null) {
		// Never practiced with attempts already handled elsewhere.
		return 0.35
	}
	if (days <= RECENCY_DAYS.fresh) {
		return 0
	}
	if (days <= RECENCY_DAYS.recent) {
		return 0.15
	}
	if (days <= RECENCY_DAYS.week) {
		return 0.35
	}
	if (days <= RECENCY_DAYS.stale) {
		return 0.55
	}
	return 0.75
}

function buildReasons (
	stats: SymbolStats,
	accuracyPercent: number,
	insufficientData: boolean,
	days: number | null,
	top: { answerSymbolId: string; count: number } | null,
): WeaknessReason[] {
	if (insufficientData) {
		return [
			{
				kind: 'insufficientData',
				message: 'Пока мало попыток — продолжайте тренировку.',
			},
		]
	}
	const reasons: WeaknessReason[] = []
	if (accuracyPercent < MASTERY_THRESHOLDS.weakAccuracy) {
		reasons.push({
			kind: 'lowAccuracy',
			message: `${Math.round(accuracyPercent)}% правильных ответов.`,
		})
	}
	if (top && top.count >= 2) {
		reasons.push({
			kind: 'confusion',
			message: `Часто путается (×${top.count}).`,
		})
	}
	if (
		stats.attempts >= MIN_ATTEMPTS_FOR_RESPONSE_TIME &&
		stats.averageResponseTimeMs >= RESPONSE_TIME_SLOW_MS
	) {
		reasons.push({
			kind: 'slowResponse',
			message: 'Среднее время ответа выше обычного.',
		})
	}
	if (days != null && days >= RECENCY_DAYS.week) {
		reasons.push({
			kind: 'overdue',
			message: 'Давно не повторяли этот символ.',
		})
	}
	return reasons.slice(0, 2)
}

function resolveTier (
	insufficientData: boolean,
	attempts: number,
	accuracyPercent: number,
	weaknessScore: number,
): MasteryTier {
	if (attempts === 0) {
		return 'new'
	}
	if (insufficientData) {
		return 'learning'
	}
	if (
		accuracyPercent >= MASTERY_THRESHOLDS.strongAccuracy &&
		weaknessScore <= MASTERY_THRESHOLDS.strongMaxWeakness
	) {
		return 'strong'
	}
	if (
		accuracyPercent >= MASTERY_THRESHOLDS.stableAccuracy &&
		weaknessScore <= MASTERY_THRESHOLDS.stableMaxWeakness
	) {
		return 'stable'
	}
	if (
		accuracyPercent < MASTERY_THRESHOLDS.weakAccuracy ||
		weaknessScore >= 0.55
	) {
		return 'weak'
	}
	return 'learning'
}

function labelForTier (tier: MasteryTier): MasteryLabelKey {
	switch (tier) {
		case 'new':
			return 'new'
		case 'strong':
			return 'excellent'
		case 'stable':
			return 'learned'
		case 'weak':
		case 'learning':
		default:
			return 'needsReview'
	}
}

/**
 * Compute weakness score 0..1 and mastery metadata for one symbol.
 */
export function evaluateSymbolMastery (
	statsInput: SymbolStats | undefined,
	symbolId: string,
	nowMs: number = getAdaptiveNowMs(),
): SymbolMastery {
	const stats = statsInput ?? createEmptySymbolStats(symbolId)
	const attempts = stats.attempts
	const accuracyPercent = calculateAccuracyPercent(stats.correct, attempts)
	const insufficientData = attempts < MIN_ATTEMPTS_FOR_WEAKNESS
	const days = daysBetween(stats.lastPracticedAt, nowMs)
	const top = topConfusionEntry(stats)

	let weaknessScore = 0
	if (attempts === 0) {
		weaknessScore = 0.4
	} else if (insufficientData) {
		// Mild priority for learning symbols — not full weakness.
		weaknessScore = clamp01(
			0.25 + accuracyComponent(accuracyPercent, stats.incorrect) * 0.35,
		)
	} else {
		weaknessScore = clamp01(
			accuracyComponent(accuracyPercent, stats.incorrect) * 0.4 +
				confusionComponent(stats) * 0.25 +
				responseTimeComponent(stats) * 0.15 +
				recencyComponent(days) * 0.2,
		)
	}

	const tier = resolveTier(
		insufficientData,
		attempts,
		accuracyPercent,
		weaknessScore,
	)
	const reasons = buildReasons(
		stats,
		accuracyPercent,
		insufficientData,
		days,
		top,
	)

	return {
		symbolId,
		stats,
		attempts,
		accuracyPercent,
		weaknessScore,
		insufficientData,
		tier,
		labelKey: labelForTier(tier),
		reasons,
		topConfusion: top,
		daysSincePractice: days,
	}
}

export function evaluateMasteryMap (
	statsMap: Record<string, SymbolStats>,
	symbolIds: string[],
	nowMs: number = getAdaptiveNowMs(),
): SymbolMastery[] {
	return symbolIds.map((id) =>
		evaluateSymbolMastery(statsMap[id], id, nowMs),
	)
}

export function getWeaknessReasons (
	mastery: SymbolMastery,
): WeaknessReason[] {
	return mastery.reasons
}
