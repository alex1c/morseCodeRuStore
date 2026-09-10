/**
 * Analytics privacy — sanitize, allowlist, coarse buckets.
 */

import {
	ANALYTICS_EVENTS,
	FORBIDDEN_ANALYTICS_PROP_KEYS,
	SAFE_ANALYTICS_PROP_KEYS,
	accuracyBucket,
	mapAlphabet,
	mapCourse,
	rhythmQualityBucket,
	sanitizeAnalyticsProps,
	sanitizeLessonId,
	sessionLengthBucket,
	wpmBucket,
} from '@/src/analytics'

describe('analytics privacy', () => {
	test('sanitize strips forbidden keys even when mixed with safe ones', () => {
		const sanitized = sanitizeAnalyticsProps({
			alphabet: 'ru',
			text: 'secret answer',
			answer: 'А',
			path: '/tmp/backup.json',
			filename: 'backup.json',
			content: '....',
			score_bucket: '85_100',
		} as never)

		expect(sanitized).toEqual({
			alphabet: 'ru',
			score_bucket: '85_100',
		})
		for (const banned of FORBIDDEN_ANALYTICS_PROP_KEYS) {
			expect(sanitized?.[banned]).toBeUndefined()
		}
	})

	test('sanitize rejects free-text string values', () => {
		const sanitized = sanitizeAnalyticsProps({
			lesson_id: 'user typed a phrase here',
			alphabet: 'latin',
		} as never)
		expect(sanitized).toEqual({ alphabet: 'latin' })
	})

	test('allowlisted event names and prop keys are defined', () => {
		expect(ANALYTICS_EVENTS.APP_OPEN).toBe('app_open')
		expect(ANALYTICS_EVENTS.LESSON_COMPLETED).toBe('lesson_completed')
		expect(ANALYTICS_EVENTS.OUTPUT_MODE_USED).toBe('output_mode_used')
		expect(SAFE_ANALYTICS_PROP_KEYS.has('content_kind')).toBe(true)
		expect(SAFE_ANALYTICS_PROP_KEYS.has('output_mode')).toBe(true)
	})

	test('buckets stay coarse', () => {
		expect(accuracyBucket(42)).toBe('0_49')
		expect(accuracyBucket(70)).toBe('70_84')
		expect(wpmBucket(8)).toBe('lt_10')
		expect(wpmBucket(22)).toBe('20_plus')
		expect(sessionLengthBucket(20)).toBe('20')
		expect(sessionLengthBucket('infinite')).toBe('infinite')
		expect(rhythmQualityBucket(0.2)).toBe('needs_practice')
		expect(rhythmQualityBucket(0.9)).toBe('good')
	})

	test('alphabet/course/lesson id helpers stay privacy-safe', () => {
		expect(mapAlphabet('LATIN')).toBe('latin')
		expect(mapCourse('latin-main')).toBe('latin_main')
		expect(sanitizeLessonId('ru-lesson-1')).toBe('ru-lesson-1')
		expect(sanitizeLessonId('bad id with spaces')).toBeUndefined()
	})
})
