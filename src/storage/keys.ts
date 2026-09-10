/**
 * AsyncStorage key map for Morse trainer persistence.
 * Prefix keeps ForestMusic apps from colliding on shared devices/tests.
 */

export const STORAGE_KEYS = {
	meta: '@morse/meta',
	preferences: '@morse/preferences',
	progress: '@morse/progress',
	symbolStats: '@morse/symbolStats',
	receiveSettings: '@morse/receiveSettings',
	transmitSettings: '@morse/transmitSettings',
	transmitStats: '@morse/transmitStats',
	sessionHistory: '@morse/sessionHistory',
	daily: '@morse/daily',
	toolSettings: '@morse/toolSettings',
} as const

/** Current local storage schema version. */
export const STORAGE_SCHEMA_VERSION = 7 as const
