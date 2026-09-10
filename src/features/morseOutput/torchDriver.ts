/**
 * Injectable torch driver — unit tests mock this; UI binds CameraView.
 */

export type TorchPermissionStatus =
	| 'unknown'
	| 'granted'
	| 'denied'
	| 'blocked'

export type TorchDriver = {
	/** Ensure camera/torch ready; request permission if needed. */
	prepare: () => Promise<
		{ ok: true } | { ok: false; status: TorchPermissionStatus; error: string }
	>
	setTorch: (on: boolean) => Promise<void>
	/** Turn off and release camera resources. */
	release: () => Promise<void>
	getPermissionStatus: () => Promise<TorchPermissionStatus>
}

let driver: TorchDriver | null = null

export function registerTorchDriver (next: TorchDriver | null): void {
	driver = next
}

export function getTorchDriver (): TorchDriver | null {
	return driver
}

/** Test helper: always-off mock driver. */
export function createMockTorchDriver (
	overrides: Partial<TorchDriver> = {},
): TorchDriver & { log: { on: boolean; at: string }[] } {
	const log: { on: boolean; at: string }[] = []
	const mock: TorchDriver & { log: typeof log } = {
		log,
		async prepare () {
			return { ok: true as const }
		},
		async setTorch (on: boolean) {
			log.push({ on, at: 'setTorch' })
		},
		async release () {
			log.push({ on: false, at: 'release' })
		},
		async getPermissionStatus () {
			return 'granted'
		},
		...overrides,
	}
	return mock
}
