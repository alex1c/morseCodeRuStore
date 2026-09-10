/**
 * Local calendar-day helpers for streak / Daily.
 * Never use toISOString().slice(0,10) for local day keys (that is UTC).
 */

export type LocalDateString = `${number}-${number}-${number}` | string

export type DayClock = {
	/** Wall time in ms (injectable for tests). */
	nowMs: () => number
}

let clock: DayClock = {
	nowMs: () => Date.now(),
}

export function setDayClockForTests (next: DayClock): void {
	clock = next
}

export function resetDayClockForTests (): void {
	clock = { nowMs: () => Date.now() }
}

export function getDayNowMs (): number {
	return clock.nowMs()
}

/**
 * Format a Date (or now) as local YYYY-MM-DD.
 */
export function toLocalDateKey (
	input: Date | number = getDayNowMs(),
): LocalDateString {
	const date = typeof input === 'number' ? new Date(input) : input
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/**
 * Parse YYYY-MM-DD as a local calendar Date at local noon
 * (avoids DST edge ambiguity when adding days).
 */
export function parseLocalDateKey (key: LocalDateString): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
	if (!match) {
		throw new Error(`Invalid local date key: ${key}`)
	}
	const y = Number(match[1])
	const m = Number(match[2])
	const d = Number(match[3])
	return new Date(y, m - 1, d, 12, 0, 0, 0)
}

/** Add (or subtract) whole calendar days to a local date key. */
export function addLocalDays (
	key: LocalDateString,
	deltaDays: number,
): LocalDateString {
	const date = parseLocalDateKey(key)
	date.setDate(date.getDate() + deltaDays)
	return toLocalDateKey(date)
}

/** Inclusive day difference: a - b in calendar days. */
export function diffLocalDays (
	a: LocalDateString,
	b: LocalDateString,
): number {
	const ms =
		parseLocalDateKey(a).getTime() - parseLocalDateKey(b).getTime()
	return Math.round(ms / 86_400_000)
}

/** Stable weekday index: 0=Mon … 6=Sun (for RU weekly strip). */
export function localWeekdayIndex (key: LocalDateString): number {
	const js = parseLocalDateKey(key).getDay() // 0=Sun
	return js === 0 ? 6 : js - 1
}

export const WEEKDAY_LABELS_RU = [
	'Пн',
	'Вт',
	'Ср',
	'Чт',
	'Пт',
	'Сб',
	'Вс',
] as const
