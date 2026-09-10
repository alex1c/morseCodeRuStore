/**
 * Pure backup parse / validate / normalize helpers.
 * No I/O — safe for unit tests and atomic restore pre-checks.
 */

import {
	DEFAULT_LEARNING_PROGRESS,
	DEFAULT_TOOL_SETTINGS,
	DEFAULT_USER_PREFERENCES,
	type LearningProgress,
	type SelectedAlphabet,
	type SymbolStatsMap,
	type ThemePreference,
	type ToolSettings,
	type UserPreferences,
} from '@/src/types'
import { emptyDailyState, type DailyState } from '@/src/domain/daily'
import {
	emptySessionHistory,
	SESSION_HISTORY_MAX,
	type SessionHistoryState,
	type SessionSummary,
} from '@/src/domain/session-history'
import {
	DEFAULT_RECEIVE_SETTINGS,
	type ReceiveSettings,
} from '@/src/features/receive'
import {
	DEFAULT_TRANSMIT_SETTINGS,
	type TransmitSettings,
	type TransmitSymbolStatsMap,
} from '@/src/features/transmit'
import {
	BACKUP_APP,
	BACKUP_FORMAT,
	BACKUP_READ_ERROR,
	BACKUP_SCHEMA_VERSION,
	type BackupParseResult,
	type BackupPayload,
	type MorseBackupDocument,
} from './types'

const ALPHABETS: SelectedAlphabet[] = ['RU', 'LATIN', 'BOTH']
const THEMES: ThemePreference[] = ['light', 'dark', 'system']
const RECEIVE_ALPHABETS = ['RU', 'LATIN'] as const
const WPM_MIN = 5
const WPM_MAX = 40
const TONE_MIN = 300
const TONE_MAX = 1000
const FARNSWORTH_MIN = 1
const FARNSWORTH_MAX = 3

const PAYLOAD_KEYS: (keyof BackupPayload)[] = [
	'preferences',
	'progress',
	'symbolStats',
	'receiveSettings',
	'transmitSettings',
	'transmitStats',
	'sessionHistory',
	'daily',
	'toolSettings',
]

function isRecord (value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp (value: number, min: number, max: number, fallback: number): number {
	if (!Number.isFinite(value)) {
		return fallback
	}
	return Math.min(max, Math.max(min, value))
}

function asBoolean (value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function pickAlphabet (
	value: unknown,
	fallback: SelectedAlphabet,
): SelectedAlphabet {
	return ALPHABETS.includes(value as SelectedAlphabet)
		? (value as SelectedAlphabet)
		: fallback
}

function pickTheme (
	value: unknown,
	fallback: ThemePreference,
): ThemePreference {
	return THEMES.includes(value as ThemePreference)
		? (value as ThemePreference)
		: fallback
}

function pickReceiveAlphabet (
	value: unknown,
	fallback: ReceiveSettings['alphabet'],
): ReceiveSettings['alphabet'] {
	return RECEIVE_ALPHABETS.includes(value as 'RU' | 'LATIN')
		? (value as 'RU' | 'LATIN')
		: fallback
}

/**
 * Fresh course progress for the chosen alphabet (first lesson unlocked).
 */
export function defaultProgressForAlphabet (
	alphabet: SelectedAlphabet,
): LearningProgress {
	if (alphabet === 'LATIN') {
		return {
			...DEFAULT_LEARNING_PROGRESS,
			currentCourseId: 'latin-main',
			currentLessonId: 'latin-lesson-1',
			unlockedLessonIds: ['latin-lesson-1'],
			completedLessonIds: [],
			bestLessonScorePercentById: {},
			knownSymbolIds: [],
			lastSessionDate: null,
		}
	}
	return {
		...DEFAULT_LEARNING_PROGRESS,
		currentCourseId: 'ru-main',
		currentLessonId: 'ru-lesson-1',
		unlockedLessonIds: ['ru-lesson-1'],
		completedLessonIds: [],
		bestLessonScorePercentById: {},
		knownSymbolIds: [],
		lastSessionDate: null,
	}
}

function normalizePreferences (
	raw: Partial<UserPreferences> | undefined,
): UserPreferences {
	const base = { ...DEFAULT_USER_PREFERENCES, ...(raw ?? {}) }
	return {
		onboardingCompleted: asBoolean(
			base.onboardingCompleted,
			DEFAULT_USER_PREFERENCES.onboardingCompleted,
		),
		selectedAlphabet: pickAlphabet(
			base.selectedAlphabet,
			DEFAULT_USER_PREFERENCES.selectedAlphabet,
		),
		toneFrequencyHz: clamp(
			Number(base.toneFrequencyHz),
			TONE_MIN,
			TONE_MAX,
			DEFAULT_USER_PREFERENCES.toneFrequencyHz,
		),
		targetWpm: clamp(
			Number(base.targetWpm),
			WPM_MIN,
			WPM_MAX,
			DEFAULT_USER_PREFERENCES.targetWpm,
		),
		farnsworthMultiplier: clamp(
			Number(base.farnsworthMultiplier),
			FARNSWORTH_MIN,
			FARNSWORTH_MAX,
			DEFAULT_USER_PREFERENCES.farnsworthMultiplier,
		),
		soundEnabled: asBoolean(
			base.soundEnabled,
			DEFAULT_USER_PREFERENCES.soundEnabled,
		),
		vibrationEnabled: asBoolean(
			base.vibrationEnabled,
			DEFAULT_USER_PREFERENCES.vibrationEnabled,
		),
		themePreference: pickTheme(
			base.themePreference,
			DEFAULT_USER_PREFERENCES.themePreference,
		),
	}
}

function normalizeProgress (
	raw: Partial<LearningProgress> | undefined,
): LearningProgress {
	const merged = { ...DEFAULT_LEARNING_PROGRESS, ...(raw ?? {}) }
	return {
		currentCourseId:
			typeof merged.currentCourseId === 'string'
				? merged.currentCourseId
				: DEFAULT_LEARNING_PROGRESS.currentCourseId,
		currentLessonId:
			typeof merged.currentLessonId === 'string'
				? merged.currentLessonId
				: DEFAULT_LEARNING_PROGRESS.currentLessonId,
		unlockedLessonIds: Array.isArray(merged.unlockedLessonIds)
			? merged.unlockedLessonIds.filter((id) => typeof id === 'string')
			: [...DEFAULT_LEARNING_PROGRESS.unlockedLessonIds],
		completedLessonIds: Array.isArray(merged.completedLessonIds)
			? merged.completedLessonIds.filter((id) => typeof id === 'string')
			: [],
		bestLessonScorePercentById: isRecord(merged.bestLessonScorePercentById)
			? (merged.bestLessonScorePercentById as Record<string, number>)
			: {},
		knownSymbolIds: Array.isArray(merged.knownSymbolIds)
			? merged.knownSymbolIds.filter((id) => typeof id === 'string')
			: [],
		lastSessionDate:
			typeof merged.lastSessionDate === 'string' ||
			merged.lastSessionDate === null
				? merged.lastSessionDate
				: null,
	}
}

function normalizeSymbolStats (raw: unknown): SymbolStatsMap {
	return isRecord(raw) ? (raw as SymbolStatsMap) : {}
}

function normalizeTransmitStats (raw: unknown): TransmitSymbolStatsMap {
	return isRecord(raw) ? (raw as TransmitSymbolStatsMap) : {}
}

function normalizeReceiveSettings (
	raw: Partial<ReceiveSettings> | undefined,
): ReceiveSettings {
	const merged = { ...DEFAULT_RECEIVE_SETTINGS, ...(raw ?? {}) }
	return {
		...DEFAULT_RECEIVE_SETTINGS,
		...merged,
		alphabet: pickReceiveAlphabet(
			merged.alphabet,
			DEFAULT_RECEIVE_SETTINGS.alphabet,
		),
		customSymbolIds: Array.isArray(merged.customSymbolIds)
			? merged.customSymbolIds.filter((id) => typeof id === 'string')
			: [],
		characterWpm: clamp(
			Number(merged.characterWpm),
			WPM_MIN,
			WPM_MAX,
			DEFAULT_RECEIVE_SETTINGS.characterWpm,
		),
		farnsworthMultiplier: clamp(
			Number(merged.farnsworthMultiplier),
			FARNSWORTH_MIN,
			FARNSWORTH_MAX,
			DEFAULT_RECEIVE_SETTINGS.farnsworthMultiplier,
		),
		toneFrequencyHz: clamp(
			Number(merged.toneFrequencyHz),
			TONE_MIN,
			TONE_MAX,
			DEFAULT_RECEIVE_SETTINGS.toneFrequencyHz,
		),
	}
}

function normalizeTransmitSettings (
	raw: Partial<TransmitSettings> | undefined,
): TransmitSettings {
	const merged = { ...DEFAULT_TRANSMIT_SETTINGS, ...(raw ?? {}) }
	return {
		...DEFAULT_TRANSMIT_SETTINGS,
		...merged,
		alphabet: pickReceiveAlphabet(
			merged.alphabet,
			DEFAULT_TRANSMIT_SETTINGS.alphabet,
		),
		customSymbolIds: Array.isArray(merged.customSymbolIds)
			? merged.customSymbolIds.filter((id) => typeof id === 'string')
			: [],
		characterWpm: clamp(
			Number(merged.characterWpm),
			WPM_MIN,
			WPM_MAX,
			DEFAULT_TRANSMIT_SETTINGS.characterWpm,
		),
		toneFrequencyHz: clamp(
			Number(merged.toneFrequencyHz),
			TONE_MIN,
			TONE_MAX,
			DEFAULT_TRANSMIT_SETTINGS.toneFrequencyHz,
		),
	}
}

/**
 * Keep newest-first history within SESSION_HISTORY_MAX (same cap as append).
 */
function normalizeSessionHistory (raw: unknown): SessionHistoryState {
	if (!isRecord(raw) || !Array.isArray(raw.sessions)) {
		return emptySessionHistory()
	}
	const sessions = (raw.sessions as SessionSummary[]).slice(
		0,
		SESSION_HISTORY_MAX,
	)
	return { sessions }
}

function normalizeDaily (raw: Partial<DailyState> | undefined): DailyState {
	if (!raw) {
		return emptyDailyState()
	}
	return {
		completedDates: Array.isArray(raw.completedDates)
			? raw.completedDates.filter((d) => typeof d === 'string')
			: [],
		lastCompletion: raw.lastCompletion ?? null,
	}
}

function normalizeToolSettings (
	raw: Partial<ToolSettings> | undefined,
): ToolSettings {
	const merged = { ...DEFAULT_TOOL_SETTINGS, ...(raw ?? {}) }
	// Explicitly rebuild known fields — never persist translator text.
	return {
		translatorAlphabet:
			merged.translatorAlphabet === 'LATIN' ? 'LATIN' : 'RU',
		translatorDirection:
			merged.translatorDirection === 'morse-to-text'
				? 'morse-to-text'
				: 'text-to-morse',
		characterWpm: clamp(
			Number(merged.characterWpm),
			WPM_MIN,
			WPM_MAX,
			DEFAULT_TOOL_SETTINGS.characterWpm,
		),
		farnsworthMultiplier: clamp(
			Number(merged.farnsworthMultiplier),
			FARNSWORTH_MIN,
			FARNSWORTH_MAX,
			DEFAULT_TOOL_SETTINGS.farnsworthMultiplier,
		),
		toneFrequencyHz: clamp(
			Number(merged.toneFrequencyHz),
			TONE_MIN,
			TONE_MAX,
			DEFAULT_TOOL_SETTINGS.toneFrequencyHz,
		),
		outputMode:
			merged.outputMode === 'vibration' ||
			merged.outputMode === 'flashlight'
				? merged.outputMode
				: 'audio',
	}
}

/**
 * Merge defaults, clamp numeric prefs, prune oversized session history.
 */
export function normalizeBackupPayload (
	payload: BackupPayload | Record<string, unknown>,
): BackupPayload {
	const p = payload as Partial<BackupPayload>
	return {
		preferences: normalizePreferences(p.preferences),
		progress: normalizeProgress(p.progress),
		symbolStats: normalizeSymbolStats(p.symbolStats),
		receiveSettings: normalizeReceiveSettings(p.receiveSettings),
		transmitSettings: normalizeTransmitSettings(p.transmitSettings),
		transmitStats: normalizeTransmitStats(p.transmitStats),
		sessionHistory: normalizeSessionHistory(p.sessionHistory),
		daily: normalizeDaily(p.daily),
		toolSettings: normalizeToolSettings(p.toolSettings),
	}
}

function hasPayloadStructures (payload: unknown): boolean {
	if (!isRecord(payload)) {
		return false
	}
	for (const key of PAYLOAD_KEYS) {
		if (!(key in payload)) {
			return false
		}
	}
	if (!isRecord(payload.preferences)) {
		return false
	}
	if (!isRecord(payload.progress)) {
		return false
	}
	if (!isRecord(payload.symbolStats)) {
		return false
	}
	if (!isRecord(payload.receiveSettings)) {
		return false
	}
	if (!isRecord(payload.transmitSettings)) {
		return false
	}
	if (!isRecord(payload.transmitStats)) {
		return false
	}
	if (
		!isRecord(payload.sessionHistory) ||
		!Array.isArray(payload.sessionHistory.sessions)
	) {
		return false
	}
	if (
		!isRecord(payload.daily) ||
		!Array.isArray(payload.daily.completedDates)
	) {
		return false
	}
	if (!isRecord(payload.toolSettings)) {
		return false
	}
	return true
}

/**
 * Structural validation of an already-parsed backup value.
 */
export function validateBackup (value: unknown): BackupParseResult {
	if (!isRecord(value)) {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (value.format !== BACKUP_FORMAT) {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (value.app !== BACKUP_APP) {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (typeof value.version !== 'string') {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (typeof value.createdAt !== 'string') {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (
		!Number.isInteger(value.schemaVersion) ||
		(value.schemaVersion as number) < 1 ||
		(value.schemaVersion as number) > BACKUP_SCHEMA_VERSION
	) {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	if (!hasPayloadStructures(value.payload)) {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	return {
		ok: true,
		backup: value as MorseBackupDocument,
	}
}

/**
 * Parse JSON string then validate backup envelope + payload shape.
 */
export function parseBackupJson (raw: string): BackupParseResult {
	let parsed: unknown
	try {
		parsed = JSON.parse(raw)
	} catch {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
	return validateBackup(parsed)
}
