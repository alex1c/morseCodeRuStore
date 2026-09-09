/**
 * Injectable clock for adaptive recency — tests freeze "now".
 */

export type AdaptiveClock = {
	nowMs: () => number
}

let clock: AdaptiveClock = {
	nowMs: () => Date.now(),
}

export function getAdaptiveNowMs (): number {
	return clock.nowMs()
}

export function setAdaptiveClockForTests (next: AdaptiveClock): void {
	clock = next
}

export function resetAdaptiveClockForTests (): void {
	clock = {
		nowMs: () => Date.now(),
	}
}

export function daysBetween (isoOrNull: string | null, nowMs: number): number | null {
	if (!isoOrNull) {
		return null
	}
	const then = Date.parse(isoOrNull)
	if (!Number.isFinite(then)) {
		return null
	}
	const diff = Math.max(0, nowMs - then)
	return diff / (24 * 60 * 60 * 1000)
}
