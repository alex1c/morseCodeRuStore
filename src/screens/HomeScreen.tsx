/**
 * Home — primary product surface for Phase 1 foundation.
 */

import { StyleSheet, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'

import { Screen } from '@/src/components/Screen'
import {
	AppButton,
	ModeCard,
	SecondaryLink,
	SurfaceCard,
} from '@/src/components/ui'
import type { RootStackParamList } from '@/src/navigation/types'
import {
	buildAdaptiveSessionPool,
	getSymbolById,
	getLessonById,
	hasEnoughAdaptiveData,
	listWeakForDisplay,
	listMasteryForAlphabet,
	selectWeakSymbolPool,
} from '@/src/domain'
import { ensureCourseDefaults } from '@/src/features/learning/progress'
import {
	adaptiveLaunchCooldown,
	buildReceiveLaunch,
} from '@/src/features/receive'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import {
	getReceiveSettings,
	getSymbolStatsMap,
	getTransmitSettings,
} from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'
import type { SymbolStatsMap } from '@/src/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>

export function HomeScreen ({ navigation }: Props) {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const [lessonTitle, setLessonTitle] = useState('Урок 1')
	const [knownCount, setKnownCount] = useState(0)
	const [hasStarted, setHasStarted] = useState(false)
	const [receiveSubtitle, setReceiveSubtitle] = useState(
		'20 вопросов · 12 WPM',
	)
	const [transmitSubtitle, setTransmitSubtitle] = useState(
		'Тренировка ключа',
	)
	const [weakPreview, setWeakPreview] = useState<string[]>([])
	const [canTrainWeak, setCanTrainWeak] = useState(false)
	const [homeAlphabet, setHomeAlphabet] = useState<'RU' | 'LATIN'>('RU')
	const [statsMap, setStatsMap] = useState<SymbolStatsMap>({})
	const [knownIds, setKnownIds] = useState<string[]>([])
	const [receiveBase, setReceiveBase] = useState<
		Partial<import('@/src/features/receive').ReceiveSettings>
	>({})

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const [progress, receive, stats, transmit] = await Promise.all([
					ensureCourseDefaults(preferences.selectedAlphabet),
					getReceiveSettings(),
					getSymbolStatsMap(),
					getTransmitSettings(),
				])
				const lesson = getLessonById(progress.currentLessonId)
				if (!active) {
					return
				}
				const alphabet =
					preferences.selectedAlphabet === 'LATIN'
						? 'LATIN'
						: preferences.selectedAlphabet === 'RU'
							? 'RU'
							: receive.alphabet
				setLessonTitle(lesson?.title ?? 'Урок 1')
				setKnownCount(progress.knownSymbolIds.length)
				setHasStarted(progress.completedLessonIds.length > 0)
				setKnownIds(progress.knownSymbolIds)
				setStatsMap(stats)
				setHomeAlphabet(alphabet)
				setReceiveBase(receive)
				const lengthLabel =
					receive.sessionLength === 'infinite'
						? '∞'
						: String(receive.sessionLength)
				setReceiveSubtitle(
					`${lengthLabel} вопросов · ${receive.characterWpm} WPM`,
				)
				setTransmitSubtitle(
					`${transmit.sessionLength} символов · ${transmit.characterWpm} WPM`,
				)
				const enough = hasEnoughAdaptiveData(stats, alphabet)
				setCanTrainWeak(enough)
				if (enough) {
					const mastery = listMasteryForAlphabet(stats, alphabet)
					const weak = listWeakForDisplay(mastery, 3)
					setWeakPreview(
						weak
							.map((item) => getSymbolById(item.symbolId)?.character)
							.filter((ch): ch is string => Boolean(ch)),
					)
				} else {
					setWeakPreview([])
				}
			})()
			return () => {
				active = false
			}
		}, [preferences.selectedAlphabet]),
	)

	const startWeakHome = () => {
		const pool = selectWeakSymbolPool({
			statsMap,
			alphabet: homeAlphabet,
			knownSymbolIds: knownIds,
		})
		if (!pool.hasEnoughData) {
			navigation.navigate('Errors')
			return
		}
		const plan = buildAdaptiveSessionPool({
			statsMap,
			alphabet: homeAlphabet,
			knownSymbolIds: knownIds,
		})
		const launch = buildReceiveLaunch({
			alphabet: homeAlphabet,
			symbolPool:
				pool.symbolIds.length > 0 ? pool.symbolIds : plan.symbolIds,
			weights: plan.weights,
			sessionLength: 20,
			baseSettings: { ...receiveBase, symbolPreset: 'weak' },
			cooldownN: adaptiveLaunchCooldown(),
		})
		navigation.navigate('ReceiveSession', launch)
	}

	return (
		<Screen contentStyle={styles.content}>
			<View style={styles.hero}>
				<Text style={[styles.appName, { color: colors.textPrimary }]}>
					Тренажёр азбуки Морзе
				</Text>
				<Text
					style={[styles.tagline, { color: colors.textSecondary }]}
				>
					Научись принимать и передавать Морзе на слух
				</Text>
			</View>

			<SurfaceCard style={styles.continueCard}>
				<Text
					style={[styles.continueEyebrow, { color: colors.accent }]}
				>
					{hasStarted ? 'Продолжить обучение' : 'Начать обучение'}
				</Text>
				<Text
					style={[styles.continueTitle, { color: colors.textPrimary }]}
				>
					{lessonTitle}
				</Text>
				<Text
					style={[
						styles.continueSubtitle,
						{ color: colors.textSecondary },
					]}
				>
					Изучено символов: {knownCount}. Короткие шаги: сначала знакомство, потом слух.
				</Text>
				<AppButton
					label={hasStarted ? 'Продолжить' : 'Начать'}
					onPress={() => navigation.navigate('Lesson')}
					style={styles.continueButton}
				/>
			</SurfaceCard>

			{canTrainWeak && weakPreview.length > 0 ? (
				<SurfaceCard style={styles.continueCard}>
					<Text
						style={[styles.continueEyebrow, { color: colors.accent }]}
					>
						Нужно повторить
					</Text>
					<Text
						style={[styles.continueTitle, { color: colors.textPrimary }]}
					>
						{weakPreview.join(' · ')}
					</Text>
					<AppButton
						label="Тренировать слабые"
						onPress={startWeakHome}
						style={styles.continueButton}
					/>
				</SurfaceCard>
			) : null}

			<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
				Основные режимы
			</Text>
			<View style={styles.modeGrid}>
				<ModeCard
					title="Приём на слух"
					subtitle={receiveSubtitle}
					onPress={() => navigation.navigate('Receive')}
				/>
				<ModeCard
					title="Передача"
					subtitle={transmitSubtitle}
					onPress={() => navigation.navigate('Transmit')}
				/>
			</View>
			<View style={[styles.modeGrid, styles.modeGridSecond]}>
				<ModeCard
					title="Мои ошибки"
					subtitle="Слабые и путаемые пары"
					onPress={() => navigation.navigate('Errors')}
				/>
				<ModeCard
					title="Быстрая тренировка"
					subtitle="Короткая сессия без курса"
					onPress={() => navigation.navigate('QuickPractice')}
				/>
			</View>

			<Text
				style={[
					styles.sectionLabel,
					styles.secondarySection,
					{ color: colors.textSecondary },
				]}
			>
				Ещё
			</Text>
			<SurfaceCard style={styles.secondaryCard}>
				<SecondaryLink
					label="Курс"
					onPress={() => navigation.navigate('Course')}
				/>
				<SecondaryLink
					label="Статистика"
					onPress={() => navigation.navigate('Stats')}
				/>
				<SecondaryLink
					label="Переводчик"
					onPress={() => navigation.navigate('Translator')}
				/>
				<SecondaryLink
					label="Справочник"
					onPress={() => navigation.navigate('Reference')}
				/>
				<SecondaryLink
					label="Обучение"
					onPress={() => navigation.navigate('Learning')}
				/>
				<SecondaryLink
					label="Настройки"
					onPress={() => navigation.navigate('Settings')}
				/>
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
	},
	hero: {
		marginBottom: spacing.lg,
	},
	appName: {
		...typography.display,
		marginBottom: spacing.xs,
	},
	tagline: {
		...typography.body,
	},
	continueCard: {
		marginBottom: spacing.xl,
	},
	continueEyebrow: {
		...typography.label,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: spacing.xs,
	},
	continueTitle: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	continueSubtitle: {
		...typography.caption,
		marginBottom: spacing.md,
	},
	continueButton: {
		alignSelf: 'stretch',
	},
	sectionLabel: {
		...typography.label,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: spacing.sm,
	},
	modeGrid: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	modeGridSecond: {
		marginTop: spacing.sm,
	},
	secondarySection: {
		marginTop: spacing.xl,
	},
	secondaryCard: {
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.sm,
	},
})
