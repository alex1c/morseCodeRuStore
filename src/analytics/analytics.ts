/**
 * Privacy-safe analytics facade — semantic events only, no user content.
 */

import {
	createAppMetricaReporter,
	type AnalyticsReporter,
} from './appMetricaAdapter'
import {
	FORBIDDEN_ANALYTICS_PROP_KEYS,
	SAFE_ANALYTICS_PROP_KEYS,
	type AnalyticsEventName,
	type SafeAnalyticsProps,
} from './events'

let reporter: AnalyticsReporter = createAppMetricaReporter()

export function setAnalyticsReporterForTests (
	next: AnalyticsReporter,
): void {
	reporter = next
}

export function resetAnalyticsReporterForTests (): void {
	reporter = createAppMetricaReporter()
}

/**
 * Coarse enum guard — rejects strings that look like user-entered content.
 * Allows snake_case / kebab lesson ids and short known enum literals.
 */
function isCoarseEnumValue (value: string): boolean {
	if (value.length === 0 || value.length > 48) {
		return false
	}
	if (/\s/.test(value)) {
		return false
	}
	return /^[a-z0-9_-]+$/.test(value)
}

/** Strips unknown / forbidden keys and free-text values. */
export function sanitizeAnalyticsProps (
	props?: SafeAnalyticsProps & Record<string, unknown>,
): Record<string, string | number | boolean> | undefined {
	if (!props) {
		return undefined
	}
	const sanitized: Record<string, string | number | boolean> = {}
	for (const rawKey of Object.keys(props)) {
		const lower = rawKey.toLowerCase()
		// Exact forbidden key match only — do not substring-match
		// allowlisted keys like content_kind.
		if (
			FORBIDDEN_ANALYTICS_PROP_KEYS.some((banned) => lower === banned)
		) {
			continue
		}
		if (!SAFE_ANALYTICS_PROP_KEYS.has(rawKey as keyof SafeAnalyticsProps)) {
			continue
		}
		const value = props[rawKey as keyof SafeAnalyticsProps]
		if (value === undefined) {
			continue
		}
		if (typeof value === 'boolean' || typeof value === 'number') {
			sanitized[rawKey] = value
			continue
		}
		if (typeof value === 'string' && isCoarseEnumValue(value)) {
			sanitized[rawKey] = value
		}
	}
	return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

/** Emits a semantic analytics event — failures are swallowed silently. */
export function trackAnalyticsEvent (
	eventName: AnalyticsEventName,
	props?: SafeAnalyticsProps,
): void {
	try {
		const attributes = sanitizeAnalyticsProps(props)
		reporter.reportEvent(eventName, attributes)
	} catch {
		// Analytics must never break user flows.
	}
}
