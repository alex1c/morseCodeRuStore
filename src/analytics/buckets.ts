/**
 * Coarse privacy-safe buckets for analytics (no raw scores / answers).
 */

export function accuracyBucket (percent: number): string {
	if (percent < 50) {
		return '0_49'
	}
	if (percent < 70) {
		return '50_69'
	}
	if (percent < 85) {
		return '70_84'
	}
	return '85_100'
}

export function wpmBucket (wpm: number): string {
	if (wpm < 10) {
		return 'lt_10'
	}
	if (wpm < 15) {
		return '10_14'
	}
	if (wpm < 20) {
		return '15_19'
	}
	return '20_plus'
}

export function sessionLengthBucket (
	length: number | 'infinite' | string,
): string {
	if (length === 'infinite' || length === Infinity) {
		return 'infinite'
	}
	const n = typeof length === 'number' ? length : Number(length)
	if (n <= 5) {
		return '5'
	}
	if (n <= 10) {
		return '10'
	}
	if (n <= 20) {
		return '20'
	}
	if (n <= 50) {
		return '50'
	}
	return '50_plus'
}

export function rhythmQualityBucket (score01: number): string {
	if (score01 < 0.4) {
		return 'needs_practice'
	}
	if (score01 < 0.7) {
		return 'ok'
	}
	return 'good'
}

export function mapAlphabet (
	value: 'RU' | 'LATIN' | 'BOTH' | string,
): 'ru' | 'latin' | 'both' {
	if (value === 'LATIN' || value === 'latin') {
		return 'latin'
	}
	if (value === 'BOTH' || value === 'both') {
		return 'both'
	}
	return 'ru'
}

export function mapCourse (
	courseId: string,
): 'ru_main' | 'latin_main' {
	return courseId.startsWith('latin') ? 'latin_main' : 'ru_main'
}

/** Lesson ids are app-authored (ru-lesson-1) — allow snake/kebab tokens. */
export function sanitizeLessonId (lessonId: string): string | undefined {
	if (!/^[a-z0-9-]{1,48}$/i.test(lessonId)) {
		return undefined
	}
	return lessonId.toLowerCase()
}
