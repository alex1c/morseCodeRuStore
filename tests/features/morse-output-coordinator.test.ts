/**
 * Output coordinator mutual exclusion + mock torch / vibration safety.
 */

import {
	createMorseOutputController,
	createMockTorchDriver,
	registerTorchDriver,
	resetSharedMorseOutputControllerForTests,
	setVibrationActuatorForTests,
} from '@/src/features/morseOutput'

jest.mock('@/src/features/playback', () => {
	let playing = false
	return {
		createSymbolPlaybackController: () => ({
			async playCode () {
				playing = true
				await new Promise((r) => setTimeout(r, 15))
				playing = false
				return { ok: true as const }
			},
			async playText () {
				playing = true
				await new Promise((r) => setTimeout(r, 15))
				playing = false
				return { ok: true as const }
			},
			async playSymbol () {
				return { ok: true as const }
			},
			async stop () {
				playing = false
			},
			isPlaying: () => playing,
		}),
		scheduleHighlightsFromTimeline: jest.fn(),
		scheduleCharacterHighlightsFromText: jest.fn(),
	}
})

describe('morse output coordinator', () => {
	const vibrate = jest.fn()
	const cancel = jest.fn()

	beforeEach(() => {
		vibrate.mockClear()
		cancel.mockClear()
		setVibrationActuatorForTests({ vibrate, cancel })
		registerTorchDriver(null)
	})

	afterEach(() => {
		setVibrationActuatorForTests(null)
		registerTorchDriver(null)
		resetSharedMorseOutputControllerForTests()
	})

	test('stop clears active mode and cancels vibration', async () => {
		const controller = createMorseOutputController()
		const playPromise = controller.play({
			mode: 'vibration',
			text: 'E',
			alphabet: 'LATIN',
			timing: {
				characterWpm: 20,
				farnsworthMultiplier: 1,
				frequencyHz: 600,
			},
		})
		await controller.stop()
		await playPromise
		expect(cancel).toHaveBeenCalled()
		expect(controller.activeMode()).toBeNull()
		controller.dispose()
	})

	test('flashlight mock ends OFF via release', async () => {
		const mock = createMockTorchDriver()
		registerTorchDriver(mock)
		const controller = createMorseOutputController()
		const result = await controller.play({
			mode: 'flashlight',
			text: 'T',
			alphabet: 'LATIN',
			timing: {
				characterWpm: 12,
				farnsworthMultiplier: 1,
				frequencyHz: 600,
			},
		})
		expect(result.ok).toBe(true)
		expect(mock.log.some((e) => e.at === 'release')).toBe(true)
		expect(mock.log[mock.log.length - 1]?.on).toBe(false)
		controller.dispose()
	})

	test('replace stops previous mode', async () => {
		const controller = createMorseOutputController()
		void controller.play({
			mode: 'vibration',
			text: 'E',
			alphabet: 'LATIN',
			timing: {
				characterWpm: 40,
				farnsworthMultiplier: 1,
				frequencyHz: 600,
			},
		})
		await new Promise((r) => setTimeout(r, 5))
		const second = await controller.play({
			mode: 'audio',
			code: ['dash'],
			timing: {
				characterWpm: 40,
				farnsworthMultiplier: 1,
				frequencyHz: 600,
			},
		})
		expect(second.ok).toBe(true)
		expect(cancel).toHaveBeenCalled()
		await controller.stop()
		controller.dispose()
	})
})
