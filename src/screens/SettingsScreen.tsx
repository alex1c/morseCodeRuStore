/**
 * Settings — alphabet, signal, theme, backup/restore, reset, app info.
 * Uses the same UserPreferences + tool settings as the rest of the app
 * (no third copy of signal defaults).
 */

import { useCallback, useState } from 'react'
import {
	Alert,
	Linking,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/src/analytics'
import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	APP_DEVELOPER,
	APP_DISPLAY_NAME,
	APP_VERSION,
	DEVELOPER_WEBSITE_URL,
	PRIVACY_POLICY_URL,
} from '@/src/constants/app'
import {
	exportBackupToShare,
	pickAndRestoreBackup,
	resetProgressKeepingPreferences,
} from '@/src/domain/backup'
import { AdBanner } from '@/src/features/ads'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getReceiveSettings,
	getTransmitSettings,
	getUserPreferences,
	saveReceiveSettings,
	saveTransmitSettings,
	updateUserPreferences,
} from '@/src/storage'
import { spacing, touchTarget, typography, useTheme } from '@/src/theme'
import type {
	SelectedAlphabet,
	ThemePreference,
	UserPreferences,
} from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>

const ALPHABET_OPTIONS: {
	value: SelectedAlphabet
	label: string
}[] = [
	{ value: 'RU', label: 'Русская' },
	{ value: 'LATIN', label: 'Международная' },
	{ value: 'BOTH', label: 'Обе' },
]

const THEME_OPTIONS: {
	value: ThemePreference
	label: string
}[] = [
	{ value: 'system', label: 'Системная' },
	{ value: 'light', label: 'Светлая' },
	{ value: 'dark', label: 'Тёмная' },
]

const WPM_MIN = 5
const WPM_MAX = 40
const WPM_STEP = 1
const TONE_MIN = 300
const TONE_MAX = 1000
const TONE_STEP = 50
const FARNSWORTH_OPTIONS = [1, 1.5, 2, 2.5, 3] as const

function clamp (value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

export function SettingsScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { refreshPreferences } = useAppBootstrap()
	const [prefs, setPrefs] = useState<UserPreferences | null>(null)
	const [busy, setBusy] = useState(false)
	const [statusMessage, setStatusMessage] = useState<string | null>(null)

	const reload = useCallback(async () => {
		const next = await getUserPreferences()
		setPrefs(next)
	}, [])

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const next = await getUserPreferences()
				if (active) {
					setPrefs(next)
				}
			})()
			return () => {
				active = false
			}
		}, []),
	)

	/**
	 * Update global preferences. When signal fields change, also sync the
	 * last Receive/Transmit setup so defaults stay coherent (not a third copy).
	 */
	const patchPrefs = async (patch: Partial<UserPreferences>) => {
		const next = await updateUserPreferences(patch)
		setPrefs(next)
		const signalTouched =
			patch.targetWpm != null ||
			patch.farnsworthMultiplier != null ||
			patch.toneFrequencyHz != null
		if (signalTouched) {
			const [receive, transmit] = await Promise.all([
				getReceiveSettings(),
				getTransmitSettings(),
			])
			await Promise.all([
				saveReceiveSettings({
					...receive,
					characterWpm: next.targetWpm,
					farnsworthMultiplier: next.farnsworthMultiplier,
					toneFrequencyHz: next.toneFrequencyHz,
				}),
				// Transmit has no Farnsworth gaps — sync WPM + tone only.
				saveTransmitSettings({
					...transmit,
					characterWpm: next.targetWpm,
					toneFrequencyHz: next.toneFrequencyHz,
				}),
			])
		}
		await refreshPreferences()
		return next
	}

	const handleExport = async () => {
		if (busy) {
			return
		}
		setBusy(true)
		setStatusMessage(null)
		try {
			const result = await exportBackupToShare()
			if (!result.ok) {
				setStatusMessage(result.error)
			} else {
				// Success only — never send filename/path.
				trackAnalyticsEvent(ANALYTICS_EVENTS.BACKUP_EXPORT_SUCCESS)
				setStatusMessage('Резервная копия готова к сохранению.')
			}
		} finally {
			setBusy(false)
		}
	}

	const handleRestore = () => {
		Alert.alert(
			'Восстановить данные?',
			'Текущий прогресс будет заменён данными из резервной копии.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Восстановить',
					style: 'destructive',
					onPress: () => {
						void (async () => {
							if (busy) {
								return
							}
							setBusy(true)
							setStatusMessage(null)
							try {
								const result = await pickAndRestoreBackup()
								if (result.ok) {
									trackAnalyticsEvent(
										ANALYTICS_EVENTS.BACKUP_RESTORE_SUCCESS,
									)
									await refreshPreferences()
									await reload()
									setStatusMessage('Данные восстановлены.')
								} else if (!result.canceled) {
									trackAnalyticsEvent(
										ANALYTICS_EVENTS.BACKUP_RESTORE_FAILED,
									)
									setStatusMessage(result.error)
								}
							} finally {
								setBusy(false)
							}
						})()
					},
				},
			],
		)
	}

	const handleReset = () => {
		Alert.alert(
			'Сбросить прогресс?',
			'Будут удалены уроки, статистика, серии и история тренировок. Настройки приложения можно сохранить.',
			[
				{ text: 'Отмена', style: 'cancel' },
				{
					text: 'Сбросить только прогресс',
					style: 'destructive',
					onPress: () => {
						void (async () => {
							if (busy) {
								return
							}
							setBusy(true)
							setStatusMessage(null)
							try {
								await resetProgressKeepingPreferences()
								await refreshPreferences()
								await reload()
								setStatusMessage(
									'Прогресс сброшен. Тема и настройки сигнала сохранены.',
								)
							} finally {
								setBusy(false)
							}
						})()
					},
				},
			],
		)
	}

	if (!prefs) {
		return (
			<Screen>
				<Text style={[styles.title, { color: colors.textPrimary }]}>
					Настройки
				</Text>
				<Text style={[styles.body, { color: colors.textSecondary }]}>
					Загрузка…
				</Text>
			</Screen>
		)
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Настройки
			</Text>

			{/* Learning */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Обучение
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
					Алфавит
				</Text>
				<View style={styles.chipRow}>
					{ALPHABET_OPTIONS.map((option) => {
						const active = prefs.selectedAlphabet === option.value
						return (
							<AppButton
								key={option.value}
								label={option.label}
								variant={active ? 'primary' : 'secondary'}
								onPress={() => {
									void patchPrefs({
										selectedAlphabet: option.value,
										onboardingCompleted: true,
									})
								}}
								style={styles.chip}
								accessibilityLabel={`Алфавит: ${option.label}`}
							/>
						)
					})}
				</View>
				<AppButton
					label="Открыть обучение"
					variant="secondary"
					onPress={() => navigation.navigate('Learning')}
					style={styles.fullButton}
				/>
				<AppButton
					label="Повторить введение"
					variant="ghost"
					onPress={() => {
						void (async () => {
							await patchPrefs({ onboardingCompleted: false })
							navigation.reset({
								index: 0,
								routes: [{ name: 'Onboarding' }],
							})
						})()
					}}
					style={styles.fullButton}
				/>
			</SurfaceCard>

			{/* Signal */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Сигнал
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
					Скорость (WPM)
				</Text>
				<View style={styles.stepperRow}>
					<AppButton
						label="−"
						variant="secondary"
						accessibilityLabel="Уменьшить WPM"
						onPress={() => {
							void patchPrefs({
								targetWpm: clamp(
									prefs.targetWpm - WPM_STEP,
									WPM_MIN,
									WPM_MAX,
								),
							})
						}}
						style={styles.stepperBtn}
					/>
					<Text
						style={[styles.stepperValue, { color: colors.textPrimary }]}
						accessibilityLabel={`${prefs.targetWpm} WPM`}
					>
						{prefs.targetWpm} WPM
					</Text>
					<AppButton
						label="+"
						variant="secondary"
						accessibilityLabel="Увеличить WPM"
						onPress={() => {
							void patchPrefs({
								targetWpm: clamp(
									prefs.targetWpm + WPM_STEP,
									WPM_MIN,
									WPM_MAX,
								),
							})
						}}
						style={styles.stepperBtn}
					/>
				</View>

				<Text
					style={[
						styles.rowLabel,
						styles.rowGap,
						{ color: colors.textTertiary },
					]}
				>
					Интервалы (Farnsworth)
				</Text>
				<View style={styles.chipRow}>
					{FARNSWORTH_OPTIONS.map((value) => {
						const active = prefs.farnsworthMultiplier === value
						return (
							<AppButton
								key={value}
								label={value === 1 ? '×1' : `×${value}`}
								variant={active ? 'primary' : 'secondary'}
								onPress={() => {
									void patchPrefs({
										farnsworthMultiplier: value,
									})
								}}
								style={styles.chip}
								accessibilityLabel={`Интервалы ${value}`}
							/>
						)
					})}
				</View>

				<Text
					style={[
						styles.rowLabel,
						styles.rowGap,
						{ color: colors.textTertiary },
					]}
				>
					Частота тона
				</Text>
				<View style={styles.stepperRow}>
					<AppButton
						label="−"
						variant="secondary"
						accessibilityLabel="Уменьшить частоту тона"
						onPress={() => {
							void patchPrefs({
								toneFrequencyHz: clamp(
									prefs.toneFrequencyHz - TONE_STEP,
									TONE_MIN,
									TONE_MAX,
								),
							})
						}}
						style={styles.stepperBtn}
					/>
					<Text
						style={[styles.stepperValue, { color: colors.textPrimary }]}
						accessibilityLabel={`${prefs.toneFrequencyHz} герц`}
					>
						{prefs.toneFrequencyHz} Гц
					</Text>
					<AppButton
						label="+"
						variant="secondary"
						accessibilityLabel="Увеличить частоту тона"
						onPress={() => {
							void patchPrefs({
								toneFrequencyHz: clamp(
									prefs.toneFrequencyHz + TONE_STEP,
									TONE_MIN,
									TONE_MAX,
								),
							})
						}}
						style={styles.stepperBtn}
					/>
				</View>
			</SurfaceCard>

			{/* Appearance */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Внешний вид
			</Text>
			<SurfaceCard style={styles.card}>
				<View style={styles.chipRow}>
					{THEME_OPTIONS.map((option) => {
						const active = prefs.themePreference === option.value
						return (
							<AppButton
								key={option.value}
								label={option.label}
								variant={active ? 'primary' : 'secondary'}
								onPress={() => {
									void patchPrefs({
										themePreference: option.value,
									})
								}}
								style={styles.chip}
								accessibilityLabel={`Тема: ${option.label}`}
							/>
						)
					})}
				</View>
			</SurfaceCard>

			{/* Data */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Данные
			</Text>
			<SurfaceCard style={styles.card}>
				<AppButton
					label={busy ? 'Подождите…' : 'Резервная копия'}
					variant="secondary"
					disabled={busy}
					onPress={() => {
						void handleExport()
					}}
					style={styles.fullButton}
				/>
				<AppButton
					label="Восстановить"
					variant="secondary"
					disabled={busy}
					onPress={handleRestore}
					style={styles.fullButton}
				/>
				<AppButton
					label="Сбросить прогресс"
					variant="ghost"
					disabled={busy}
					onPress={handleReset}
					style={styles.fullButton}
				/>
				{statusMessage ? (
					<Text
						style={[styles.status, { color: colors.textSecondary }]}
						accessibilityLiveRegion="polite"
					>
						{statusMessage}
					</Text>
				) : null}
			</SurfaceCard>

			{/* Privacy — honest local + Yandex Ads / AppMetrica wording */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Ваши данные
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.privacyLine, { color: colors.textPrimary }]}>
					Учебный прогресс, статистика занятий и введённые вами тексты
					в «{APP_DISPLAY_NAME}» хранятся локально на устройстве.
				</Text>
				<Text style={[styles.privacyLine, { color: colors.textPrimary }]}>
					Для показа рекламы и агрегированной технической/продуктовой
					аналитики приложение использует сервисы Яндекса (рекламная
					сеть и AppMetrica).
				</Text>
				<Text style={[styles.privacyLine, { color: colors.textPrimary }]}>
					• Аккаунт не требуется
				</Text>
				<Text style={[styles.privacyLine, { color: colors.textPrimary }]}>
					• Резервная копия создаётся только по вашему действию
				</Text>
				<Text style={[styles.privacyLine, { color: colors.textPrimary }]}>
					• Текст переводчика не сохраняется
				</Text>
			</SurfaceCard>

			{/* About */}
			<Text style={[styles.section, { color: colors.textSecondary }]}>
				О приложении
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.aboutTitle, { color: colors.textPrimary }]}>
					{APP_DISPLAY_NAME}
				</Text>
				<Text style={[styles.aboutLine, { color: colors.textSecondary }]}>
					Версия {APP_VERSION}
				</Text>
				<Text style={[styles.aboutLine, { color: colors.textSecondary }]}>
					{APP_DEVELOPER}
				</Text>
				<AppButton
					label="Политика конфиденциальности"
					variant="secondary"
					onPress={() => {
						void Linking.openURL(PRIVACY_POLICY_URL)
					}}
					style={styles.fullButton}
					accessibilityLabel="Открыть политику конфиденциальности"
				/>
				<AppButton
					label="Сайт разработчика"
					variant="ghost"
					onPress={() => {
						void Linking.openURL(DEVELOPER_WEBSITE_URL)
					}}
					style={styles.fullButton}
					accessibilityLabel="Открыть сайт разработчика"
				/>
			</SurfaceCard>

			<AdBanner placement="settings" />
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
		marginBottom: spacing.md,
	},
	body: {
		...typography.body,
	},
	section: {
		...typography.label,
		marginTop: spacing.md,
		marginBottom: spacing.sm,
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	card: {
		marginBottom: spacing.sm,
		gap: spacing.sm,
	},
	rowLabel: {
		...typography.label,
	},
	rowGap: {
		marginTop: spacing.xs,
	},
	chipRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minHeight: touchTarget.min,
		paddingHorizontal: spacing.md,
	},
	fullButton: {
		alignSelf: 'stretch',
		minHeight: touchTarget.min,
	},
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	stepperBtn: {
		minWidth: touchTarget.min,
		minHeight: touchTarget.min,
	},
	stepperValue: {
		...typography.bodyStrong,
		minWidth: 96,
		textAlign: 'center',
	},
	status: {
		...typography.caption,
		marginTop: spacing.xs,
	},
	privacyLine: {
		...typography.body,
	},
	aboutTitle: {
		...typography.bodyStrong,
	},
	aboutLine: {
		...typography.caption,
	},
})
