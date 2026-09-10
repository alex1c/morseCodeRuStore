/**
 * Public Morse output API for Translator / Reference tools.
 */

export type {
	MorseOutputMode,
	MorseOutputRequest,
	MorseOutputResult,
	MorseOutputTiming,
} from './types'
export {
	FLASHLIGHT_MAX_WPM,
	TOOL_PLAYBACK_MAX_CHARS,
	VIBRATION_MIN_TONE_MS,
} from './types'

export {
	timelineToBinaryPulses,
	timelineToVibrationPattern,
	type BinaryPulse,
} from './pattern'

export {
	createMockTorchDriver,
	getTorchDriver,
	registerTorchDriver,
	type TorchDriver,
	type TorchPermissionStatus,
} from './torchDriver'

export {
	getVibrationActuator,
	setVibrationActuatorForTests,
	type VibrationActuator,
} from './vibrationActuator'

export {
	createMorseOutputController,
	getSharedMorseOutputController,
	resetSharedMorseOutputControllerForTests,
	type MorseOutputController,
} from './coordinator'

export { TorchHost } from './TorchHost'
