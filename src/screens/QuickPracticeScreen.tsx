/**
 * Quick Practice — one tap into adaptive or balanced Receive session.
 */

import { useCallback, useRef, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import {
	buildAdaptiveSessionPool,
	hasEnoughAdaptiveData,
} from '@/src/domain'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
	resolveReceiveSymbolPool,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	getLearningProgress,
	getReceiveSettings,
	getSymbolStatsMap,
} from '@/src/storage'
import { typography, useTheme } from '@/src/theme'

type Props = NativeStackScreenProps<RootStackParamList, 'QuickPractice'>

export function QuickPracticeScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [status, setStatus] = useState('Готовим тренировку…')
	const launchedRef = useRef(false)

	useFocusEffect(
		useCallback(() => {
			let active = true
			launchedRef.current = false
			void (async () => {
				try {
					const [stats, progress, receive] = await Promise.all([
						getSymbolStatsMap(),
						getLearningProgress(),
						getReceiveSettings(),
					])
					if (!active || launchedRef.current) {
						return
					}
					const alphabet =
						preferences.selectedAlphabet === 'LATIN'
							? 'LATIN'
							: preferences.selectedAlphabet === 'RU'
								? 'RU'
								: receive.alphabet

					const enough = hasEnoughAdaptiveData(stats, alphabet)
					const plan = enough
						? buildAdaptiveSessionPool({
							statsMap: stats,
							alphabet,
							knownSymbolIds: progress.knownSymbolIds,
						})
						: {
							symbolIds: resolveReceiveSymbolPool({
								alphabet,
								preset: 'known',
								knownSymbolIds: progress.knownSymbolIds,
								customSymbolIds: [],
							}).symbolIds,
							weights: undefined as undefined,
						}

					if (plan.symbolIds.length === 0) {
						setStatus('Нет доступных символов для тренировки.')
						return
					}

					const launch = buildReceiveLaunch({
						alphabet,
						symbolPool: plan.symbolIds,
						weights: plan.weights,
						sessionLength: 20,
						baseSettings: {
							...receive,
							symbolPreset: enough ? 'adaptive' : 'known',
						},
						cooldownN: adaptiveLaunchCooldown(),
					})
					launchedRef.current = true
					navigation.replace('ReceiveSession', launch)
				} catch {
					if (active) {
						setStatus('Не удалось начать тренировку.')
					}
				}
			})()
			return () => {
				active = false
			}
		}, [navigation, preferences.selectedAlphabet]),
	)

	return (
		<Screen>
			<Text style={[styles.status, { color: colors.textSecondary }]}>
				{status}
			</Text>
		</Screen>
	)
}

const styles = StyleSheet.create({
	status: {
		...typography.body,
	},
})
