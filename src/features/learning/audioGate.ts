type PlayTask = () => Promise<void>

/**
 * Serialize/replace audio playback requests.
 * New playback cancels old one by calling stop before start.
 */
export function createAudioGate (deps: {
	stop: () => Promise<void>
}): {
	playReplacing: (task: PlayTask) => Promise<void>
	stop: () => Promise<void>
} {
	let generation = 0
	let active = Promise.resolve()

	const stop = async () => {
		generation += 1
		await deps.stop()
	}

	const playReplacing = async (task: PlayTask) => {
		await stop()
		const token = generation
		active = (async () => {
			if (token !== generation) {
				return
			}
			await task()
		})()
		await active
	}

	return {
		playReplacing,
		stop,
	}
}
