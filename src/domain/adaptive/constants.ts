/**
 * Adaptive training constants — centralized, UI-free.
 *
 * Weakness score (0..1) combines:
 * - error / low-accuracy penalty
 * - confusion penalty
 * - slow response penalty (only after enough timed attempts)
 * - recency / forgetting penalty
 *
 * Symbols with fewer than MIN_ATTEMPTS_FOR_WEAKNESS attempts are
 * "insufficient data" — not labeled weak solely from missing history.
 */

export const MIN_ATTEMPTS_FOR_WEAKNESS = 3
export const MIN_ATTEMPTS_FOR_RESPONSE_TIME = 3
export const MIN_WEAK_POOL_SIZE = 4
export const MIN_ADAPTIVE_DATA_SYMBOLS = 2
export const MIN_CONFUSION_PAIR_COUNT = 2

/** Response-time bands relative to this baseline (ms). */
export const RESPONSE_TIME_BASELINE_MS = 1800
export const RESPONSE_TIME_SLOW_MS = 2500
export const RESPONSE_TIME_FAST_MS = 900

/** Soft floor so strong symbols still appear in weighted draws. */
export const MIN_REVIEW_WEIGHT = 0.12

/** Adaptive session mix — domain config, not UI. */
export const ADAPTIVE_POOL_MIX = {
	weakShare: 0.5,
	confusedShare: 0.25,
	overdueShare: 0.15,
	strongShare: 0.1,
	/** Soft caps for how many ids to pull from each bucket. */
	maxWeak: 8,
	maxConfused: 6,
	maxOverdue: 4,
	maxStrong: 3,
} as const

/** Pair training: targets + contrast distractors. */
export const PAIR_TRAINING_DISTRACTORS = 2
export const SINGLE_TARGET_DISTRACTORS = 4
export const DEFAULT_FOCUSED_SESSION_LENGTH = 20 as const

/** Cooldown: avoid repeating recent symbols when pool allows. */
export const DEFAULT_COOLDOWN_N = 2
export const PAIR_COOLDOWN_N = 1

/** Recency buckets in days since last practice. */
export const RECENCY_DAYS = {
	fresh: 1,
	recent: 3,
	week: 7,
	stale: 21,
} as const

export const MASTERY_THRESHOLDS = {
	/** Accuracy % for strong (with enough attempts). */
	strongAccuracy: 90,
	stableAccuracy: 80,
	weakAccuracy: 70,
	strongMaxWeakness: 0.25,
	stableMaxWeakness: 0.45,
} as const
