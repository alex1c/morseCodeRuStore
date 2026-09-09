/**
 * Symbol detail — lightweight mastery explanation + focused actions.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	buildSingleSymbolTrainingPlan,
	evaluateSymbolMastery,
	getSymbolById,
	getVisualMnemonicBySymbolId,
	sequenceToPattern,
} from '@/src/domain'
import { createSymbolPlaybackController } from '@/src/features/playback'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
} from '@/src/features/receive'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getReceiveSettings,
	getSymbolStatsMap,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SymbolStats } from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'SymbolDetail'>

function formatDays (days: number | null): string {
	if (days == null) {
		return 'ещё не было'
	}
	if (days < 1) {
		return 'сегодня'
	}
	if (days < 2) {
		return 'вчера'
	}
	return `${Math.floor(days)} дн. назад`
}

export function SymbolDetailScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const { symbolId, alphabet } = route.params
	const [stats, setStats] = useState<SymbolStats | undefined>()
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [showMnemonic, setShowMnemonic] = useState(false)
	const playbackRef = useRef(createSymbolPlaybackController())
	const [prefs, setPrefs] = useState({
		characterWpm: 12,
		farnsworthMultiplier: 1.5,
		toneFrequencyHz: 600,
	})

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [map, progress, receive] = await Promise.all([
					getSymbolStatsMap(),
					getLearningProgress(),
					getReceiveSettings(),
				])
				if (!active) {
					return
				}
				setStats(map[symbolId])
				setKnownIds(progress.knownSymbolIds)
				setPrefs({
					characterWpm: receive.characterWpm,
					farnsworthMultiplier: receive.farnsworthMultiplier,
					toneFrequencyHz: receive.toneFrequencyHz,
				})
			})()
			return () => {
				active = false
				void playbackRef.current.stop()
			}
		}, [symbolId]),
	)

	const symbol = getSymbolById(symbolId)
	const mastery = useMemo(
		() => evaluateSymbolMastery(stats, symbolId),
		[stats, symbolId],
	)
	const mnemonic = getVisualMnemonicBySymbolId(symbolId)
	const confusionLines = Object.entries(stats?.confusionMap ?? {})
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)

	if (!symbol) {
		return (
			<Screen>
				<Text style={{ color: colors.danger }}>Символ не найден.</Text>
			</Screen>
		)
	}

	const trainFocused = () => {
		const plan = buildSingleSymbolTrainingPlan({
			statsMap: stats ? { [symbolId]: stats } : {},
			alphabet,
			targetSymbolId: symbolId,
			knownSymbolIds: knownIds,
		})
		const launch = buildReceiveLaunch({
			alphabet,
			symbolPool: plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: prefs,
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', launch)
	}

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.char, { color: colors.textPrimary }]}>
				{symbol.character}
			</Text>
			<Text
				style={[styles.pattern, { color: colors.textSecondary }]}
				accessibilityLabel={`Код Морзе: ${symbol.code
					.map((el) => (el === 'dot' ? 'точка' : 'тире'))
					.join(' ')}`}
			>
				{sequenceToPattern(symbol.code)}
			</Text>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Точность: {Math.round(mastery.accuracyPercent)}%
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Попыток: {mastery.attempts}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Средний ответ:{' '}
					{mastery.stats.averageResponseTimeMs > 0
						? `${(mastery.stats.averageResponseTimeMs / 1000).toFixed(1)} с`
						: '—'}
				</Text>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Последняя практика: {formatDays(mastery.daysSincePractice)}
				</Text>
				{mastery.reasons.map((reason) => (
					<Text
						key={reason.kind}
						style={[styles.reason, { color: colors.textPrimary }]}
					>
						• {reason.message}
					</Text>
				))}
			</SurfaceCard>

			{confusionLines.length > 0 ? (
				<SurfaceCard style={styles.card}>
					<Text style={[styles.section, { color: colors.textSecondary }]}>
						Чаще всего вместо {symbol.character}:
					</Text>
					{confusionLines.map(([id, count]) => (
						<Text
							key={id}
							style={[styles.meta, { color: colors.textPrimary }]}
						>
							{getSymbolById(id)?.character ?? '?'} — {count}
						</Text>
					))}
				</SurfaceCard>
			) : null}

			<View style={styles.actions}>
				<AppButton
					label="Прослушать"
					onPress={() => {
						void playbackRef.current.playSymbol(symbolId, {
							characterWpm: prefs.characterWpm,
							farnsworthMultiplier: prefs.farnsworthMultiplier,
							frequencyHz: prefs.toneFrequencyHz,
						})
					}}
				/>
				<AppButton
					label={`Тренировать ${symbol.character}`}
					onPress={trainFocused}
				/>
				{mnemonic ? (
					<AppButton
						label="Визуальная подсказка"
						variant="secondary"
						onPress={() => setShowMnemonic((prev) => !prev)}
					/>
				) : null}
			</View>

			{showMnemonic && mnemonic ? (
				<VisualMnemonicCard symbolId={symbolId} />
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		gap: spacing.sm,
		paddingBottom: spacing.xxl,
	},
	char: {
		fontSize: 48,
		lineHeight: 56,
		fontWeight: '700',
	},
	pattern: {
		...typography.subtitle,
	},
	card: {
		gap: spacing.xs,
	},
	meta: {
		...typography.body,
	},
	reason: {
		...typography.caption,
	},
	section: {
		...typography.caption,
	},
	actions: {
		gap: spacing.sm,
	},
})
