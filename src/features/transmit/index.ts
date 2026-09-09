/**
 * Transmit feature public API.
 */

export type {
	TransmitAlphabet,
	TransmitAnswerRecord,
	TransmitMachineState,
	TransmitPressRecord,
	TransmitQuestion,
	TransmitSessionLength,
	TransmitSessionResult,
	TransmitSettings,
	TransmitSymbolPreset,
	TransmitSymbolStats,
	TransmitSymbolStatsMap,
} from './types'
export {
	DEFAULT_TRANSMIT_SETTINGS,
	TRANSMIT_AUTO_EVAL_DELAY_MS,
	TRANSMIT_MAX_ELEMENTS,
	TRANSMIT_TONE_MAX,
	TRANSMIT_TONE_MIN,
	TRANSMIT_TONE_STEP,
	TRANSMIT_WPM_MAX,
	TRANSMIT_WPM_MIN,
	TRANSMIT_WPM_STEP,
	createEmptyTransmitSymbolStats,
} from './constants'
export {
	buildTransmitErrorFocusPool,
	generateTransmitQuestions,
	resolveTransmitSymbolPool,
} from './generator'
export {
	applyTransmitAttempt,
	buildTransmitSessionResult,
} from './result'
export {
	canKey,
	createInitialTransmitContext,
	currentTransmitQuestion,
	pressesToElements,
	reduceTransmitMachine,
	type TransmitMachineContext,
	type TransmitMachineEvent,
} from './stateMachine'
