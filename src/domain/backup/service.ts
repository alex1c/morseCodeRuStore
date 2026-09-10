/**
 * Backup export / restore / progress-reset service (Phase 10).
 * Restore is atomic: snapshot → validate/normalize → multiSet → rollback on failure.
 * Never deletes user-exported backup files. Never stores translator text.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as DocumentPicker from 'expo-document-picker'
import * as Sharing from 'expo-sharing'
import {
	cacheDirectory,
	documentDirectory,
	readAsStringAsync,
	writeAsStringAsync,
} from 'expo-file-system/legacy'

import { APP_VERSION } from '@/src/constants/app'
import { emptyDailyState } from '@/src/domain/daily'
import { emptySessionHistory } from '@/src/domain/session-history'
import {
	applyStorageSnapshot,
	ensureStorageMigrated,
	getDailyState,
	getLearningProgress,
	getReceiveSettings,
	getSessionHistory,
	getSymbolStatsMap,
	getToolSettings,
	getTransmitSettings,
	getTransmitStatsMap,
	getUserPreferences,
	readStorageSnapshot,
	resetStorageMigrationFlag,
	saveDailyState,
	saveLearningProgress,
	saveSessionHistory,
	saveSymbolStatsMap,
	saveTransmitStatsMap,
	saveUserPreferences,
	STORAGE_KEYS,
	STORAGE_SCHEMA_VERSION,
} from '@/src/storage'
import {
	BACKUP_APP,
	BACKUP_FORMAT,
	BACKUP_READ_ERROR,
	BACKUP_SCHEMA_VERSION,
	type BackupActionResult,
	type BackupPayload,
	type MorseBackupDocument,
} from './types'
import {
	defaultProgressForAlphabet,
	normalizeBackupPayload,
	parseBackupJson,
	validateBackup,
} from './validate'

const EXPORT_ERROR = 'Не удалось создать резервную копию.'
const SHARE_UNAVAILABLE_ERROR = 'Обмен файлами недоступен на этом устройстве.'

/**
 * Collect current user data for export (no translator text fields).
 */
export async function buildBackupPayload (): Promise<BackupPayload> {
	await ensureStorageMigrated()
	const [
		preferences,
		progress,
		symbolStats,
		receiveSettings,
		transmitSettings,
		transmitStats,
		sessionHistory,
		daily,
		toolSettings,
	] = await Promise.all([
		getUserPreferences(),
		getLearningProgress(),
		getSymbolStatsMap(),
		getReceiveSettings(),
		getTransmitSettings(),
		getTransmitStatsMap(),
		getSessionHistory(),
		getDailyState(),
		getToolSettings(),
	])
	return {
		preferences,
		progress,
		symbolStats,
		receiveSettings,
		transmitSettings,
		transmitStats,
		sessionHistory,
		daily,
		toolSettings,
	}
}

/**
 * Build a full versioned backup document from live storage.
 */
export async function createBackupDocument (): Promise<MorseBackupDocument> {
	const payload = await buildBackupPayload()
	return {
		format: BACKUP_FORMAT,
		app: BACKUP_APP,
		version: APP_VERSION,
		createdAt: new Date().toISOString(),
		schemaVersion: BACKUP_SCHEMA_VERSION,
		payload,
	}
}

/** Pretty-printed JSON for share / file export. */
export function serializeBackup (backup: MorseBackupDocument): string {
	return JSON.stringify(backup, null, 2)
}

function backupFileUri (createdAt: string): string | null {
	const dir = cacheDirectory ?? documentDirectory
	if (!dir) {
		return null
	}
	const day = createdAt.slice(0, 10) || 'backup'
	return `${dir}morse-code-trainer-backup-${day}.json`
}

/**
 * Write a temp backup file and open the system share sheet.
 */
export async function exportBackupToShare (): Promise<BackupActionResult> {
	try {
		const backup = await createBackupDocument()
		const json = serializeBackup(backup)
		const uri = backupFileUri(backup.createdAt)
		if (!uri) {
			return { ok: false, error: EXPORT_ERROR }
		}
		await writeAsStringAsync(uri, json)
		const canShare = await Sharing.isAvailableAsync()
		if (!canShare) {
			return { ok: false, error: SHARE_UNAVAILABLE_ERROR }
		}
		await Sharing.shareAsync(uri, {
			mimeType: 'application/json',
			dialogTitle: 'Резервная копия',
			UTI: 'public.json',
		})
		return { ok: true }
	} catch {
		return { ok: false, error: EXPORT_ERROR }
	}
}

function payloadToStorageEntries (
	payload: BackupPayload,
): [string, string][] {
	return [
		[
			STORAGE_KEYS.meta,
			JSON.stringify({ schemaVersion: STORAGE_SCHEMA_VERSION }),
		],
		[STORAGE_KEYS.preferences, JSON.stringify(payload.preferences)],
		[STORAGE_KEYS.progress, JSON.stringify(payload.progress)],
		[STORAGE_KEYS.symbolStats, JSON.stringify(payload.symbolStats)],
		[STORAGE_KEYS.receiveSettings, JSON.stringify(payload.receiveSettings)],
		[
			STORAGE_KEYS.transmitSettings,
			JSON.stringify(payload.transmitSettings),
		],
		[STORAGE_KEYS.transmitStats, JSON.stringify(payload.transmitStats)],
		[STORAGE_KEYS.sessionHistory, JSON.stringify(payload.sessionHistory)],
		[STORAGE_KEYS.daily, JSON.stringify(payload.daily)],
		[STORAGE_KEYS.toolSettings, JSON.stringify(payload.toolSettings)],
	]
}

/**
 * Restore a snapshot map (including null → remove) for rollback.
 */
async function restoreSnapshotMap (
	snapshot: Record<string, string | null>,
): Promise<void> {
	const toSet: [string, string][] = []
	const toRemove: string[] = []
	for (const key of Object.values(STORAGE_KEYS)) {
		const value = snapshot[key]
		if (value == null) {
			toRemove.push(key)
		} else {
			toSet.push([key, value])
		}
	}
	if (toSet.length > 0) {
		await applyStorageSnapshot(toSet)
	}
	if (toRemove.length > 0) {
		await AsyncStorage.multiRemove(toRemove)
	}
}

/**
 * Atomic restore from a validated backup object.
 * Snapshots current storage, writes normalized payload, rolls back on failure.
 */
export async function restoreFromBackupObject (
	backup: MorseBackupDocument,
): Promise<BackupActionResult> {
	const validated = validateBackup(backup)
	if (!validated.ok) {
		return { ok: false, error: validated.error }
	}
	const normalized = normalizeBackupPayload(validated.backup.payload)
	const snapshot = await readStorageSnapshot()
	try {
		await applyStorageSnapshot(payloadToStorageEntries(normalized))
		resetStorageMigrationFlag()
		await ensureStorageMigrated()
		return { ok: true }
	} catch {
		try {
			await restoreSnapshotMap(snapshot)
			resetStorageMigrationFlag()
		} catch {
			// Best-effort rollback; surface original restore failure.
		}
		return { ok: false, error: BACKUP_READ_ERROR }
	}
}

/**
 * Parse JSON string and atomically restore.
 */
export async function restoreFromJsonString (
	raw: string,
): Promise<BackupActionResult> {
	const parsed = parseBackupJson(raw)
	if (!parsed.ok) {
		return { ok: false, error: parsed.error }
	}
	return restoreFromBackupObject(parsed.backup)
}

/**
 * Let the user pick a backup file, then restore it.
 */
export async function pickAndRestoreBackup (): Promise<BackupActionResult> {
	try {
		const result = await DocumentPicker.getDocumentAsync({
			type: ['application/json', 'text/plain', '*/*'],
			copyToCacheDirectory: true,
			multiple: false,
		})
		if (result.canceled || !result.assets?.[0]?.uri) {
			return { ok: false, error: BACKUP_READ_ERROR, canceled: true }
		}
		const raw = await readAsStringAsync(result.assets[0].uri)
		return restoreFromJsonString(raw)
	} catch {
		return { ok: false, error: BACKUP_READ_ERROR }
	}
}

/**
 * Reset lessons / stats / history / daily / transmit stats.
 * Keeps theme, signal prefs, alphabet, onboardingCompleted=true,
 * and receive / transmit / tool settings.
 * Does NOT delete previously exported backup files.
 */
export async function resetProgressKeepingPreferences (): Promise<void> {
	await ensureStorageMigrated()
	const preferences = await getUserPreferences()
	const nextPreferences = {
		...preferences,
		onboardingCompleted: true,
	}
	const progress = defaultProgressForAlphabet(
		nextPreferences.selectedAlphabet,
	)
	await saveUserPreferences(nextPreferences)
	await saveLearningProgress(progress)
	await saveSymbolStatsMap({})
	await saveTransmitStatsMap({})
	await saveSessionHistory(emptySessionHistory())
	await saveDailyState(emptyDailyState())
}
