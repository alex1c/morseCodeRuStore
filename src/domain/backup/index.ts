/**
 * Backup / restore / progress-reset domain (Phase 10).
 */

export {
	BACKUP_APP,
	BACKUP_FORMAT,
	BACKUP_READ_ERROR,
	BACKUP_SCHEMA_VERSION,
	type BackupActionResult,
	type BackupErr,
	type BackupOk,
	type BackupParseResult,
	type BackupPayload,
	type MorseBackupDocument,
} from './types'

export {
	defaultProgressForAlphabet,
	normalizeBackupPayload,
	parseBackupJson,
	validateBackup,
} from './validate'

export {
	buildBackupPayload,
	createBackupDocument,
	exportBackupToShare,
	pickAndRestoreBackup,
	resetProgressKeepingPreferences,
	restoreFromBackupObject,
	restoreFromJsonString,
	serializeBackup,
} from './service'
