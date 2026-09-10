/**
 * Receive session result summary.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import { getSymbolById } from '@/src/domain'
import type { RootStackParamList } from '@/src/navigation/types'
import { spacing, typography, useTheme } from '@/src/theme'
import { wallTimeMs } from '@/src/utils/clock'

type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveResult'>

export function ReceiveResultScreen ({ navigation, route }: Props) {
	const { colors } = useTheme()
	const { result, settings, symbolPool, weights, durationMs } = route.params

	const strong = result.strongSymbolIds
		.map((id) => getSymbolById(id)?.character ?? '?')
		.join(' ')
	const errors = result.errorCounts
		.map((item) => {
			const ch = getSymbolById(item.symbolId)?.character ?? '?'
			return `${ch} — ${item.count}`
		})
		.join('\n')
	const pairs = result.confusionPairs
		.map((item) => {
			const from = getSymbolById(item.expectedSymbolId)?.character ?? '?'
			const to = getSymbolById(item.answerSymbolId)?.character ?? '?'
			return `${from} → ${to} — ${item.count}`
		})
		.join('\n')

	const showCharacterAccuracy =
		result.characterTotal > 0 &&
		(settings.contentKind !== 'symbol' || result.characterTotal > 1)

	const durationLabel =
		durationMs == null
			? null
			: `${Math.max(1, Math.round(durationMs / 60_000))} мин`

	const multiWrongItems = result.wrongItems.filter(
		(item) => item.contentKind !== 'symbol',
	)
	const symbolWrongIds = result.wrongItems
		.filter((item) => item.contentKind === 'symbol')
		.flatMap((item) => item.requiredSymbolIds)

	const retryErrors = () => {
		if (multiWrongItems.length > 0) {
			const count = multiWrongItems.length
			const sessionLength =
				count <= 5 ? 5 : count <= 10 ? 10 : 20
			navigation.replace('ReceiveSession', {
				settings: {
					...settings,
					contentKind: multiWrongItems[0].contentKind,
					sessionLength,
				},
				symbolPool,
				seed: wallTimeMs() % 1_000_000,
				weights,
				sessionSource: 'receive',
				sessionStartedAtMs: wallTimeMs(),
				retryItems: multiWrongItems.map((item) => ({
					text: item.text,
					contentKind: item.contentKind as Exclude<
						typeof item.contentKind,
						'symbol'
					>,
					requiredSymbolIds: item.requiredSymbolIds,
				})),
			})
			return
		}
		if (symbolWrongIds.length > 0) {
			const unique = [...new Set(symbolWrongIds)]
			const sessionLength =
				unique.length <= 10 ? 10 : unique.length <= 20 ? 20 : 50
			navigation.replace('ReceiveSession', {
				settings: {
					...settings,
					contentKind: 'symbol',
					symbolPreset: 'custom',
					customSymbolIds: unique,
					sessionLength,
				},
				symbolPool: unique,
				seed: wallTimeMs() % 1_000_000,
				weights,
				sessionSource: 'receive',
				sessionStartedAtMs: wallTimeMs(),
			})
		}
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Тренировка завершена
			</Text>
			<SurfaceCard style={styles.card}>
				<Text style={[styles.score, { color: colors.textPrimary }]}>
					{result.correct} / {result.total}
				</Text>
				<Text style={[styles.percent, { color: colors.primary }]}>
					{result.accuracyPercent}%
				</Text>
				{showCharacterAccuracy ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						По символам: {result.characterAccuracyPercent}%
						{' '}
						({result.characterCorrect}/{result.characterTotal})
					</Text>
				) : null}
				{durationLabel ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Длительность: {durationLabel}
					</Text>
				) : null}
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Среднее время ответа:{' '}
					{result.averageResponseTimeMs == null
						? '—'
						: `${(result.averageResponseTimeMs / 1000).toFixed(1)} сек`}
				</Text>
				{strong ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Сильные: {strong}
					</Text>
				) : null}
				{errors ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Ошибки:{'\n'}
						{errors}
					</Text>
				) : null}
				{pairs ? (
					<Text style={[styles.meta, { color: colors.textSecondary }]}>
						Пары:{'\n'}
						{pairs}
					</Text>
				) : null}
			</SurfaceCard>

			<View style={styles.actions}>
				{result.wrongItems.length > 0 ? (
					<AppButton
						label="Повторить ошибки"
						onPress={retryErrors}
					/>
				) : null}
				<AppButton
					label="Ещё раз"
					onPress={() => {
						navigation.replace('ReceiveSession', {
							settings,
							symbolPool,
							seed: wallTimeMs() % 1_000_000,
							weights,
							sessionSource: 'receive',
							sessionStartedAtMs: wallTimeMs(),
						})
					}}
				/>
				<AppButton
					label="Изменить настройки"
					variant="secondary"
					onPress={() => navigation.navigate('Receive')}
				/>
				<AppButton
					label="На главный экран"
					variant="secondary"
					onPress={() => navigation.navigate('Home')}
				/>
			</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.title,
		marginBottom: spacing.md,
	},
	card: {
		gap: spacing.xs,
	},
	score: {
		fontSize: 34,
		lineHeight: 40,
		fontWeight: '700',
	},
	percent: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
	},
	meta: {
		...typography.caption,
	},
	actions: {
		marginTop: spacing.lg,
		gap: spacing.sm,
	},
})
