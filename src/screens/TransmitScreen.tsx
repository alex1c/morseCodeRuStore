/**
 * Transmit setup — alphabet, symbols, length, WPM.
 */

import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import { getSymbolById, sequenceToPattern } from '@/src/domain'
import {
	DEFAULT_TRANSMIT_SETTINGS,
	TRANSMIT_TONE_MAX,
	TRANSMIT_TONE_MIN,
	TRANSMIT_TONE_STEP,
	TRANSMIT_WPM_MAX,
	TRANSMIT_WPM_MIN,
	TRANSMIT_WPM_STEP,
	resolveTransmitSymbolPool,
	type TransmitSettings,
	type TransmitSymbolPreset,
} from '@/src/features/transmit'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getTransmitSettings,
	getTransmitStatsMap,
	saveTransmitSettings,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'Transmit'>

function clamp (value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

export function TransmitScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [settings, setSettings] = useState<TransmitSettings>(
		DEFAULT_TRANSMIT_SETTINGS,
	)
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [transmitStats, setTransmitStats] = useState<
		Awaited<ReturnType<typeof getTransmitStatsMap>>
	>({})
	const [error, setError] = useState<string | null>(null)

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [stored, progress, stats] = await Promise.all([
					getTransmitSettings(),
					getLearningProgress(),
					getTransmitStatsMap(),
				])
				if (!active) {
					return
				}
				const alphabet =
					preferences.selectedAlphabet === 'LATIN'
						? 'LATIN'
						: preferences.selectedAlphabet === 'RU'
							? 'RU'
							: stored.alphabet
				setSettings({ ...stored, alphabet })
				setKnownIds(progress.knownSymbolIds)
				setTransmitStats(stats)
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const pool = useMemo(
		() =>
			resolveTransmitSymbolPool({
				alphabet: settings.alphabet,
				preset: settings.symbolPreset,
				knownSymbolIds: knownIds,
				customSymbolIds: settings.customSymbolIds,
				transmitStats,
			}),
		[settings, knownIds, transmitStats],
	)

	const availableSymbols = useMemo(
		() =>
			resolveTransmitSymbolPool({
				alphabet: settings.alphabet,
				preset: 'all-available',
				knownSymbolIds: knownIds,
				customSymbolIds: [],
			}),
		[settings.alphabet, knownIds],
	)

	const persist = async (next: TransmitSettings) => {
		setSettings(next)
		await saveTransmitSettings(next)
	}

	const start = async () => {
		if (pool.length === 0) {
			setError('Выберите хотя бы один символ для тренировки.')
			return
		}
		setError(null)
		await saveTransmitSettings(settings)
		navigation.navigate('TransmitSession', {
			settings,
			symbolPool: pool,
			seed: wallTimeMs() % 1_000_000,
		})
	}

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Передача
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Тренировка телеграфного ключа: удерживайте, чтобы передать
				точки и тире.
			</Text>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Алфавит
			</Text>
			<View style={styles.row}>
				{(['RU', 'LATIN'] as const).map((value) => (
					<AppButton
						key={value}
						label={value === 'RU' ? 'Русский' : 'Международная'}
						variant={settings.alphabet === value ? 'primary' : 'secondary'}
						onPress={() => {
							void persist({
								...settings,
								alphabet: value,
								customSymbolIds: [],
							})
						}}
						style={styles.flex}
					/>
				))}
			</View>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Набор символов
			</Text>
			<View style={styles.wrap}>
				{(
					[
						['known', 'Изученные'],
						['weak', 'Слабые'],
						['all-available', 'Все доступные'],
						['custom', 'Свой набор'],
					] as [TransmitSymbolPreset, string][]
				).map(([value, label]) => (
					<AppButton
						key={value}
						label={label}
						variant={
							settings.symbolPreset === value ? 'primary' : 'secondary'
						}
						onPress={() => {
							void persist({ ...settings, symbolPreset: value })
						}}
						style={styles.chipBtn}
					/>
				))}
			</View>

			{settings.symbolPreset === 'custom' ? (
				<SurfaceCard style={styles.pickerCard}>
					<View style={styles.row}>
						<AppButton
							label="Изученные"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								void persist({
									...settings,
									customSymbolIds: knownIds.filter((id) =>
										availableSymbols.includes(id),
									),
								})
							}}
						/>
						<AppButton
							label="Очистить"
							variant="secondary"
							style={styles.flex}
							onPress={() => {
								void persist({ ...settings, customSymbolIds: [] })
							}}
						/>
					</View>
					<View style={styles.grid}>
						{availableSymbols.map((id) => {
							const symbol = getSymbolById(id)
							if (!symbol) {
								return null
							}
							const selected = settings.customSymbolIds.includes(id)
							return (
								<Pressable
									key={id}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									accessibilityLabel={`Символ ${symbol.character}${selected ? ', выбран' : ''}`}
									onPress={() => {
										const next = selected
											? settings.customSymbolIds.filter((x) => x !== id)
											: [...settings.customSymbolIds, id]
										void persist({
											...settings,
											customSymbolIds: next,
										})
									}}
									style={[
										styles.symbolCell,
										{
											borderColor: selected
												? colors.primary
												: colors.border,
											backgroundColor: selected
												? colors.primaryMuted
												: colors.surface,
										},
									]}
								>
									<Text
										style={[
											styles.symbolChar,
											{ color: colors.textPrimary },
										]}
									>
										{symbol.character}
									</Text>
									<Text
										style={[
											styles.symbolCode,
											{ color: colors.textSecondary },
										]}
										accessible={false}
									>
										{sequenceToPattern(symbol.code)}
									</Text>
								</Pressable>
							)
						})}
					</View>
				</SurfaceCard>
			) : null}

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Длина сессии
			</Text>
			<View style={styles.row}>
				{([10, 20, 50] as const).map((value) => (
					<AppButton
						key={value}
						label={String(value)}
						variant={
							settings.sessionLength === value ? 'primary' : 'secondary'
						}
						style={styles.flex}
						onPress={() => {
							void persist({ ...settings, sessionLength: value })
						}}
					/>
				))}
			</View>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Скорость ключа {settings.characterWpm} WPM
			</Text>
			<View style={styles.row}>
				<AppButton
					label="−"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						void persist({
							...settings,
							characterWpm: clamp(
								settings.characterWpm - TRANSMIT_WPM_STEP,
								TRANSMIT_WPM_MIN,
								TRANSMIT_WPM_MAX,
							),
						})
					}}
				/>
				<AppButton
					label="+"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						void persist({
							...settings,
							characterWpm: clamp(
								settings.characterWpm + TRANSMIT_WPM_STEP,
								TRANSMIT_WPM_MIN,
								TRANSMIT_WPM_MAX,
							),
						})
					}}
				/>
			</View>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Тон {settings.toneFrequencyHz} Гц
			</Text>
			<View style={styles.row}>
				<AppButton
					label="−"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						void persist({
							...settings,
							toneFrequencyHz: clamp(
								settings.toneFrequencyHz - TRANSMIT_TONE_STEP,
								TRANSMIT_TONE_MIN,
								TRANSMIT_TONE_MAX,
							),
						})
					}}
				/>
				<AppButton
					label="+"
					variant="secondary"
					style={styles.flex}
					onPress={() => {
						void persist({
							...settings,
							toneFrequencyHz: clamp(
								settings.toneFrequencyHz + TRANSMIT_TONE_STEP,
								TRANSMIT_TONE_MIN,
								TRANSMIT_TONE_MAX,
							),
						})
					}}
				/>
			</View>

			{error ? (
				<Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
			) : null}

			<AppButton label="Начать передачу" onPress={() => void start()} />
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		gap: spacing.sm,
		paddingBottom: spacing.xxl,
	},
	title: {
		...typography.title,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.sm,
	},
	label: {
		...typography.caption,
		marginTop: spacing.xs,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	wrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	flex: {
		flex: 1,
	},
	chipBtn: {
		minWidth: 100,
	},
	pickerCard: {
		gap: spacing.sm,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	symbolCell: {
		width: 72,
		minHeight: 64,
		borderWidth: 1,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.xs,
	},
	symbolChar: {
		...typography.subtitle,
	},
	symbolCode: {
		...typography.caption,
	},
	error: {
		...typography.caption,
	},
})
