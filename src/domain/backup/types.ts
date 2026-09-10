/**
 * Versioned Morse trainer backup document contracts (Phase 10).
 * Payload mirrors AsyncStorage user data — never includes translator text.
 */

import type {
	LearningProgress,
	SymbolStatsMap,
	ToolSettings,
	UserPreferences,
} from '@/src/types'
import type { DailyState } from '@/src/domain/daily'
import type { SessionHistoryState } from '@/src/domain/session-history'
import type { ReceiveSettings } from '@/src/features/receive'
import type {
	TransmitSettings,
	TransmitSymbolStatsMap,
} from '@/src/features/transmit'

/** Discriminator — restore must not rely on filename alone. */
export const BACKUP_FORMAT = 'morse-code-trainer-backup' as const

/** App id embedded in every backup document. */
export const BACKUP_APP = 'morse-code-trainer' as const

/** Backup envelope schema — migrate v1 → current in future releases. */
export const BACKUP_SCHEMA_VERSION = 1 as const

/** User-facing parse / validate / restore failure message. */
export const BACKUP_READ_ERROR = 'Не удалось прочитать резервную копию.'

/**
 * All persisted user data keys included in a backup payload.
 * Intentionally omits translator text (never stored) and storage meta
 * (rewritten to STORAGE_SCHEMA_VERSION on restore).
 */
export type BackupPayload = {
	preferences: UserPreferences
	progress: LearningProgress
	symbolStats: SymbolStatsMap
	receiveSettings: ReceiveSettings
	transmitSettings: TransmitSettings
	transmitStats: TransmitSymbolStatsMap
	sessionHistory: SessionHistoryState
	daily: DailyState
	toolSettings: ToolSettings
}

export type MorseBackupDocument = {
	format: typeof BACKUP_FORMAT
	app: typeof BACKUP_APP
	/** App version that created the backup (informational). */
	version: string
	/** ISO timestamp when the backup was created. */
	createdAt: string
	schemaVersion: number
	payload: BackupPayload
}

export type BackupOk<T> = { ok: true; backup: T }
export type BackupErr = { ok: false; error: string }
export type BackupParseResult = BackupOk<MorseBackupDocument> | BackupErr
export type BackupActionResult =
	| { ok: true }
	| { ok: false; error: string; canceled?: boolean }
