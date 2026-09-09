/**
 * Safer delay that respects a shared cancellation flag.
 */

export function cancellableDelay (
	ms: number,
	signal: { cancelled: boolean },
): Promise<void> {
	return new Promise((resolve) => {
		if (ms <= 0 || signal.cancelled) {
			resolve()
			return
		}
		const started = Date.now()
		const step = () => {
			if (signal.cancelled || Date.now() - started >= ms) {
				resolve()
				return
			}
			const remaining = ms - (Date.now() - started)
			setTimeout(step, Math.min(40, Math.max(0, remaining)))
		}
		setTimeout(step, Math.min(40, ms))
	})
}
