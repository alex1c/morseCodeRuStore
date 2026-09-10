/**
 * My Errors — weak symbols, confusion pairs, overdue review.
 */

import { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	extractConfusionPairs,
	getSymbolById,
	hasEnoughAdaptiveData,
	listMasteryForAlphabet,
	listOverdueSymbols,
	listWeakForDisplay,
	buildAdaptiveSessionPool,
	buildPairTrainingPlan,
	selectWeakSymbolPool,
} from '@/src/domain'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
	pairLaunchCooldown,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getReceiveSettings,
	getSymbolStatsMap,
} from '@/src/storage'
import { wallTimeMs } from '@/src/utils/clock'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SymbolStatsMap } from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Errors'>

function attemptsLabel (count: number): string {
	const mod10 = count % 10
	const mod100 = count % 100
	if (mod10 === 1 && mod100 !== 11) {
		return `${count} попытка`
	}
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
		return `${count} попытки`
	}
	return `${count} попыток`
}

export function ErrorsScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [statsMap, setStatsMap] = useState<SymbolStatsMap>({})
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [alphabet, setAlphabet] = useState<'RU' | 'LATIN'>('RU')
	const [baseSettings, setBaseSettings] = useState<
		Partial<import('@/src/features/receive').ReceiveSettings>
	>({})

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [stats, progress, receive] = await Promise.all([
					getSymbolStatsMap(),
					getLearningProgress(),
					getReceiveSettings(),
				])
				if (!active) {
					return
				}
				const nextAlphabet =
					preferences.selectedAlphabet === 'LATIN'
						? 'LATIN'
						: preferences.selectedAlphabet === 'RU'
							? 'RU'
							: receive.alphabet
				setStatsMap(stats)
				setKnownIds(progress.knownSymbolIds)
				setAlphabet(nextAlphabet)
				setBaseSettings(receive)
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const mastery = useMemo(
		() => listMasteryForAlphabet(statsMap, alphabet),
		[statsMap, alphabet],
	)
	const weak = useMemo(() => listWeakForDisplay(mastery), [mastery])
	const pairs = useMemo(
		() => extractConfusionPairs(statsMap, alphabet).slice(0, 8),
		[statsMap, alphabet],
	)
	const overdue = useMemo(() => listOverdueSymbols(mastery, 6), [mastery])
	const enough = hasEnoughAdaptiveData(statsMap, alphabet)

	const startWeak = () => {
		const pool = selectWeakSymbolPool({
			statsMap,
			alphabet,
			knownSymbolIds: knownIds,
		})
		if (!pool.hasEnoughData || pool.symbolIds.length === 0) {
			return
		}
		const launch = buildReceiveLaunch({
			alphabet,
			symbolPool: pool.symbolIds,
			sessionLength: 20,
			baseSettings: { ...baseSettings, symbolPreset: 'weak' },
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', {
			...launch,
			sessionSource: 'receive',
			sessionStartedAtMs: wallTimeMs(),
		})
	}

	const startPair = (symbolIdA: string, symbolIdB: string) => {
		const plan = buildPairTrainingPlan({
			statsMap,
			alphabet,
			symbolIdA,
			symbolIdB,
			knownSymbolIds: knownIds,
		})
		const launch = buildReceiveLaunch({
			alphabet,
			symbolPool: plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: { ...baseSettings, symbolPreset: 'custom' },
			cooldownN: pairLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', {
			...launch,
			sessionSource: 'receive',
			sessionStartedAtMs: wallTimeMs(),
		})
	}

	const startAdaptive = () => {
		const plan = buildAdaptiveSessionPool({
			statsMap,
			alphabet,
			knownSymbolIds: knownIds,
		})
		const launch = buildReceiveLaunch({
			alphabet,
			symbolPool: plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: { ...baseSettings, symbolPreset: 'adaptive' },
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', {
			...launch,
			sessionSource: 'receive',
			sessionStartedAtMs: wallTimeMs(),
		})
	}

	if (!enough) {
		return (
			<Screen>
				<Text style={[styles.title, { color: colors.textPrimary }]}>
					Мои ошибки
				</Text>
				<SurfaceCard style={styles.card}>
					<Text style={[styles.body, { color: colors.textSecondary }]}>
						Здесь появятся ваши слабые символы. После нескольких
						тренировок приложение покажет, что стоит повторить.
					</Text>
					<AppButton
						label="Начать тренировку"
						onPress={() => navigation.navigate('Receive')}
					/>
				</SurfaceCard>
			</Screen>
		)
	}

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Мои ошибки
			</Text>

			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Слабые символы
			</Text>
			<SurfaceCard style={styles.card}>
				{weak.length === 0 ? (
					<Text style={[styles.body, { color: colors.textSecondary }]}>
						Пока нет явно слабых символов.
					</Text>
				) : (
					weak.map((item) => {
						const symbol = getSymbolById(item.symbolId)
						return (
							<Pressable
								key={item.symbolId}
								onPress={() =>
									navigation.navigate('SymbolDetail', {
										symbolId: item.symbolId,
										alphabet,
									})
								}
								accessibilityRole="button"
								accessibilityLabel={`Символ ${symbol?.character ?? '?'}, точность ${Math.round(item.accuracyPercent)} процентов`}
								style={styles.rowItem}
							>
								<Text
									style={[styles.symbol, { color: colors.textPrimary }]}
								>
									{symbol?.character ?? '?'}
								</Text>
								<Text
									style={[styles.meta, { color: colors.textSecondary }]}
								>
									{Math.round(item.accuracyPercent)}% ·{' '}
									{attemptsLabel(item.attempts)}
								</Text>
							</Pressable>
						)
					})
				)}
				<AppButton label="Тренировать слабые" onPress={startWeak} />
			</SurfaceCard>

			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Чаще всего путаю
			</Text>
			<SurfaceCard style={styles.card}>
				{pairs.length === 0 ? (
					<Text style={[styles.body, { color: colors.textSecondary }]}>
						Пар путаницы пока нет.
					</Text>
				) : (
					pairs.map((pair) => {
						const a = getSymbolById(pair.symbolIdA)?.character ?? '?'
						const b = getSymbolById(pair.symbolIdB)?.character ?? '?'
						return (
							<View key={`${pair.symbolIdA}|${pair.symbolIdB}`} style={styles.pairRow}>
								<Text
									style={[styles.symbol, { color: colors.textPrimary }]}
								>
									{a} ↔ {b}
								</Text>
								<Text
									style={[styles.meta, { color: colors.textSecondary }]}
								>
									{pair.total} ошибок
								</Text>
								<AppButton
									label="Тренировать пару"
									variant="secondary"
									onPress={() =>
										startPair(pair.symbolIdA, pair.symbolIdB)
									}
								/>
							</View>
						)
					})
				)}
			</SurfaceCard>

			<Text style={[styles.section, { color: colors.textSecondary }]}>
				Нужно повторить
			</Text>
			<SurfaceCard style={styles.card}>
				{overdue.length === 0 ? (
					<Text style={[styles.body, { color: colors.textSecondary }]}>
						Нет давно не повторённых символов.
					</Text>
				) : (
					<Text style={[styles.body, { color: colors.textPrimary }]}>
						{overdue
							.map((item) => getSymbolById(item.symbolId)?.character ?? '?')
							.join(' · ')}
					</Text>
				)}
				<AppButton
					label="Умная тренировка"
					variant="secondary"
					onPress={startAdaptive}
				/>
			</SurfaceCard>
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
		marginBottom: spacing.xs,
	},
	section: {
		...typography.caption,
		marginTop: spacing.sm,
	},
	card: {
		gap: spacing.sm,
	},
	body: {
		...typography.body,
	},
	rowItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		minHeight: 44,
	},
	pairRow: {
		gap: spacing.xs,
		paddingVertical: spacing.xs,
	},
	symbol: {
		...typography.subtitle,
	},
	meta: {
		...typography.caption,
	},
})
