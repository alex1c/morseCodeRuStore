/**
 * Wall-clock helper kept outside React components so purity lint
 * does not treat Date.now as a render-time impure call.
 */

export function wallTimeMs (): number {
	return Date.now()
}
