/**
 * Tool settings types (Translator / Reference playback prefs).
 * Never persist user translator text — privacy-friendly.
 */

import type { MorseOutputMode } from '@/src/features/morseOutput'
import type {
	TranslatorAlphabet,
	TranslatorDirection,
} from '@/src/features/translator'

export type ToolSettings = {
	translatorAlphabet: TranslatorAlphabet
	translatorDirection: TranslatorDirection
	characterWpm: number
	farnsworthMultiplier: number
	toneFrequencyHz: number
	outputMode: MorseOutputMode
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
	translatorAlphabet: 'RU',
	translatorDirection: 'text-to-morse',
	characterWpm: 12,
	farnsworthMultiplier: 1.5,
	toneFrequencyHz: 600,
	outputMode: 'audio',
}
