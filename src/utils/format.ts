/**
 * Tiny formatting helpers shared across screens/tests.
 */

/**
 * Format ISO-like timestamp or return em dash when empty.
 */
export function formatOptionalDate (value: string | null): string {
	if (!value) {
		return '—'
	}
	return value
}
