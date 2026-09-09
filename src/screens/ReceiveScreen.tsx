/**
 * Receive setup — alphabet, answer mode, pool, speed, length.
 */

import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	getSymbolById,
	sequenceToPattern,
} from '@/src/domain'
import {
	DEFAULT_RECEIVE_SETTINGS,
	RECEIVE_SPACING_OPTIONS,
	RECEIVE_TONE_MAX,
	RECEIVE_TONE_MIN,
	RECEIVE_TONE_STEP,
	RECEIVE_WPM_MAX,
	RECEIVE_WPM_MIN,
	RECEIVE_WPM_STEP,
	resolveReceiveSymbolPool,
	type ReceiveAnswerMode,
	type ReceiveSettings,
	type ReceiveSymbolPreset,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getReceiveSettings,
	getSymbolStatsMap,
	saveReceiveSettings,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

function clamp (value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

export function ReceiveScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [settings, setSettings] = useState<ReceiveSettings>(
		DEFAULT_RECEIVE_SETTINGS,
	)
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [statsMap, setStatsMap] = useState<Record<string, import('@/src/types').SymbolStats>>({})
	const [error, setError] = useState<string | null>(null)

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [stored, progress, stats] = await Promise.all([
					getReceiveSettings(),
					getLearningProgress(),
					getSymbolStatsMap(),
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
				setSettings({
					...stored,
					alphabet,
				})
				setKnownIds(progress.knownSymbolIds)
				setStatsMap(stats)
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const poolResolution = useMemo(
		() =>
			resolveReceiveSymbolPool({
				alphabet: settings.alphabet,
				preset: settings.symbolPreset,
				knownSymbolIds: knownIds,
				customSymbolIds: settings.customSymbolIds,
				statsMap,
			}),
		[settings, knownIds, statsMap],
	)
	const pool = poolResolution.symbolIds

	const availableSymbols = useMemo(
		() =>
			resolveReceiveSymbolPool({
				alphabet: settings.alphabet,
				preset: 'all-available',
				knownSymbolIds: knownIds,
				customSymbolIds: [],
			}).symbolIds,
		[settings.alphabet, knownIds],
	)

	const persist = async (next: ReceiveSettings) => {
		setSettings(next)
		await saveReceiveSettings(next)
	}

	const start = async () => {
		if (
			(settings.symbolPreset === 'weak' ||
				settings.symbolPreset === 'adaptive') &&
			!poolResolution.hasEnoughData
		) {
			setError(
				'Пока недостаточно данных. Пройдите несколько тренировок.',
			)
			return
		}
		if (pool.length === 0) {
			setError('Выберите хотя бы один символ для тренировки.')
			return
		}
		setError(null)
		await saveReceiveSettings(settings)
		navigation.navigate('ReceiveSession', {
			settings,
			symbolPool: pool,
			seed: wallTimeMs() % 1_000_000,
			weights: poolResolution.weights,
		})
	}

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Приём на слух
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Самостоятельная тренировка: слушай сигнал и выбирай символ.
			</Text>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Алфавит
			</Text>
			<View style={styles.row}>
				{(['RU', 'LATIN'] as const).map((value) => (
					<AppButton
						key={value}
						label={value === 'RU' ? 'Русский' : 'Latin'}
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
				Режим ответа
			</Text>
			<View style={styles.wrap}>
				{(
					[
						['choices', '4 варианта'],
						['keyboard', 'Клавиатура'],
						['paper', 'Бумага'],
					] as [ReceiveAnswerMode, string][]
				).map(([value, label]) => (
					<AppButton
						key={value}
						label={label}
						variant={settings.answerMode === value ? 'primary' : 'secondary'}
						onPress={() => {
							void persist({ ...settings, answerMode: value })
						}}
						style={styles.chipBtn}
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
						['adaptive', 'Умная тренировка'],
						['all-available', 'Все доступные'],
						['custom', 'Свой набор'],
					] as [ReceiveSymbolPreset, string][]
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
			{settings.symbolPreset === 'weak' && !poolResolution.hasEnoughData ? (
				<SurfaceCard>
					<Text style={[styles.hint, { color: colors.textSecondary }]}>
						Пока недостаточно данных. Пройдите несколько тренировок.
					</Text>
					<AppButton
						label="Обычная тренировка"
						variant="secondary"
						onPress={() => {
							void persist({ ...settings, symbolPreset: 'known' })
						}}
					/>
				</SurfaceCard>
			) : null}
			{settings.symbolPreset === 'adaptive' && !poolResolution.hasEnoughData ? (
				<Text style={[styles.hint, { color: colors.textTertiary }]}>
					Умная тренировка станет точнее после нескольких сессий. Сейчас
					используется запасной набор изученных символов.
				</Text>
			) : null}

			{settings.symbolPreset === 'custom' ? (
				<SurfaceCard style={styles.pickerCard}>
					<View style={styles.row}>
						<AppButton
							label="Изученные"
							variant="secondary"
							onPress={() => {
								void persist({
									...settings,
									customSymbolIds: knownIds.filter((id) =>
										availableSymbols.includes(id),
									),
								})
							}}
							style={styles.flex}
						/>
						<AppButton
							label="Очистить"
							variant="secondary"
							onPress={() => {
								void persist({
									...settings,
									customSymbolIds: [],
								})
							}}
							style={styles.flex}
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
									accessibilityLabel={`Символ ${symbol.character}, код ${sequenceToPattern(symbol.code)}${selected ? ', выбран' : ''}`}
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
			<View style={styles.wrap}>
				{([10, 20, 50, 'infinite'] as const).map((value) => (
					<AppButton
						key={String(value)}
						label={value === 'infinite' ? '∞' : String(value)}
						variant={
							settings.sessionLength === value ? 'primary' : 'secondary'
						}
						onPress={() => {
							void persist({ ...settings, sessionLength: value })
						}}
						style={styles.chipBtn}
					/>
				))}
			</View>

			<SurfaceCard style={styles.controls}>
				<Text style={[styles.controlTitle, { color: colors.textPrimary }]}>
					Скорость символов: {settings.characterWpm} WPM
				</Text>
				<View style={styles.row}>
					<AppButton
						label="−"
						variant="secondary"
						onPress={() => {
							void persist({
								...settings,
								characterWpm: clamp(
									settings.characterWpm - RECEIVE_WPM_STEP,
									RECEIVE_WPM_MIN,
									RECEIVE_WPM_MAX,
								),
							})
						}}
						style={styles.flex}
					/>
					<AppButton
						label="+"
						variant="secondary"
						onPress={() => {
							void persist({
								...settings,
								characterWpm: clamp(
									settings.characterWpm + RECEIVE_WPM_STEP,
									RECEIVE_WPM_MIN,
									RECEIVE_WPM_MAX,
								),
							})
						}}
						style={styles.flex}
					/>
				</View>

				<Text style={[styles.controlTitle, { color: colors.textPrimary }]}>
					Интервалы (Farnsworth)
				</Text>
				<Text style={[styles.hint, { color: colors.textTertiary }]}>
					Точки и тире остаются на той же скорости, увеличиваются только
					паузы между символами.
				</Text>
				<View style={styles.wrap}>
					{RECEIVE_SPACING_OPTIONS.map((value) => (
						<AppButton
							key={value}
							label={value === 1 ? 'обычные' : `${value}×`}
							variant={
								settings.farnsworthMultiplier === value
									? 'primary'
									: 'secondary'
							}
							onPress={() => {
								void persist({
									...settings,
									farnsworthMultiplier: value,
								})
							}}
							style={styles.chipBtn}
						/>
					))}
				</View>

				<Text style={[styles.controlTitle, { color: colors.textPrimary }]}>
					Тон: {settings.toneFrequencyHz} Hz
				</Text>
				<View style={styles.row}>
					<AppButton
						label="−"
						variant="secondary"
						onPress={() => {
							void persist({
								...settings,
								toneFrequencyHz: clamp(
									settings.toneFrequencyHz - RECEIVE_TONE_STEP,
									RECEIVE_TONE_MIN,
									RECEIVE_TONE_MAX,
								),
							})
						}}
						style={styles.flex}
					/>
					<AppButton
						label="+"
						variant="secondary"
						onPress={() => {
							void persist({
								...settings,
								toneFrequencyHz: clamp(
									settings.toneFrequencyHz + RECEIVE_TONE_STEP,
									RECEIVE_TONE_MIN,
									RECEIVE_TONE_MAX,
								),
							})
						}}
						style={styles.flex}
					/>
				</View>
			</SurfaceCard>

			<Text style={[styles.hint, { color: colors.textSecondary }]}>
				В пуле сейчас: {pool.length} символов
			</Text>
			{error ? (
				<Text style={[styles.error, { color: colors.danger }]}>
					{error}
				</Text>
			) : null}
			<AppButton label="Начать тренировку" onPress={() => void start()} />
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
		gap: spacing.xs,
	},
	title: {
		...typography.title,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.sm,
	},
	label: {
		...typography.label,
		marginTop: spacing.sm,
		marginBottom: spacing.xs,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flex: {
		flex: 1,
	},
	wrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chipBtn: {
		minWidth: 96,
	},
	hint: {
		...typography.caption,
		marginBottom: spacing.xs,
	},
	error: {
		...typography.caption,
		marginBottom: spacing.sm,
	},
	controls: {
		gap: spacing.sm,
		marginTop: spacing.md,
	},
	controlTitle: {
		...typography.bodyStrong,
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
		width: '23%',
		minHeight: 64,
		borderWidth: 1.5,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		padding: spacing.xs,
	},
	symbolChar: {
		...typography.bodyStrong,
	},
	symbolCode: {
		fontSize: 11,
		lineHeight: 14,
	},
})
