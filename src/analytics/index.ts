/**
 * Analytics public API (Phase 11).
 */

export {
	sanitizeAnalyticsProps,
	trackAnalyticsEvent,
	setAnalyticsReporterForTests,
	resetAnalyticsReporterForTests,
} from './analytics'
export {
	initializeAppMetrica,
	resetAppMetricaForTests,
} from './appMetricaAdapter'
export {
	ANALYTICS_EVENTS,
	FORBIDDEN_ANALYTICS_PROP_KEYS,
	SAFE_ANALYTICS_PROP_KEYS,
	type AnalyticsEventName,
	type SafeAnalyticsProps,
} from './events'
export {
	accuracyBucket,
	mapAlphabet,
	mapCourse,
	rhythmQualityBucket,
	sanitizeLessonId,
	sessionLengthBucket,
	wpmBucket,
} from './buckets'
