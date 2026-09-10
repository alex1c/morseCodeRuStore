/**
 * Learning — expandable product guide with interactive Morse demos.
 */

import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
	useFocusEffect,
	useNavigation,
} from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'

import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	LEARNING_DEMO_SYMBOL_IDS,
	LEARNING_TOPICS,
	getSymbolById,
	type LearningActionRoute,
	type LearningTopic,
} from '@/src/domain'
import { getSharedMorseOutputController } from '@/src/features/morseOutput'
import type { RootStackParamList } from '@/src/navigation/types'
import { spacing, typography, useTheme } from '@/src/theme'

type Nav = NativeStackNavigationProp<RootStackParamList>

const WPM_STEPS = [8, 12, 20] as const

/** Default tone settings for guide demos (audio-only). */
const DEMO_TONE_HZ = 600
const DEMO_CHAR_WPM = 15

function isStackRoute (
	route: LearningActionRoute,
): route is keyof RootStackParamList {
	return route !== 'first-lesson' && route !== 'demo-only'
}

function TopicDemo ({
	topic,
	playing,
	onPlayExample,
	onPlayWpm,
	onPlayFarnsworth,
	onStop,
}: {
	topic: LearningTopic
	playing: boolean
	onPlayExample: () => void
	onPlayWpm: (wpm: number) => void
	onPlayFarnsworth: (multiplier: number) => void
	onStop: () => void
}) {
	const { colors } = useTheme()

	if (!topic.demo) {
		return null
	}

	if (topic.demo === 'morse-example') {
		const symbol = getSymbolById(LEARNING_DEMO_SYMBOL_IDS.morseExample)
		return (
			<View style={styles.demoBlock}>
				<Text style={[styles.demoHint, { color: colors.textSecondary }]}>
					Пример: буква {symbol?.character ?? 'А'}
				</Text>
				<View style={styles.demoRow}>
					<AppButton
						label={playing ? 'Стоп' : 'Прослушать пример'}
						variant={playing ? 'secondary' : 'primary'}
						onPress={playing ? onStop : onPlayExample}
						style={styles.demoButton}
					/>
				</View>
			</View>
		)
	}

	if (topic.demo === 'wpm') {
		const symbol = getSymbolById(LEARNING_DEMO_SYMBOL_IDS.wpmLetter)
		return (
			<View style={styles.demoBlock}>
				<Text style={[styles.demoHint, { color: colors.textSecondary }]}>
					Одна буква ({symbol?.character ?? 'А'}) на разной скорости
				</Text>
				<View style={styles.demoRow}>
					{WPM_STEPS.map((wpm) => (
						<AppButton
							key={wpm}
							label={`${wpm} WPM`}
							variant="secondary"
							onPress={() => onPlayWpm(wpm)}
							disabled={playing}
							style={styles.demoChip}
						/>
					))}
				</View>
				{playing ? (
					<AppButton
						label="Стоп"
						variant="ghost"
						onPress={onStop}
						style={styles.stopLink}
					/>
				) : null}
			</View>
		)
	}

	if (topic.demo === 'farnsworth') {
		return (
			<View style={styles.demoBlock}>
				<Text style={[styles.demoHint, { color: colors.textSecondary }]}>
					Слово «АН» — та же скорость буквы, разные интервалы
				</Text>
				<View style={styles.demoRow}>
					<AppButton
						label="Обычные интервалы"
						variant="secondary"
						onPress={() => onPlayFarnsworth(1)}
						disabled={playing}
						style={styles.demoButton}
					/>
					<AppButton
						label="Интервалы ×2"
						variant="secondary"
						onPress={() => onPlayFarnsworth(2)}
						disabled={playing}
						style={styles.demoButton}
					/>
				</View>
				{playing ? (
					<AppButton
						label="Стоп"
						variant="ghost"
						onPress={onStop}
						style={styles.stopLink}
					/>
				) : null}
			</View>
		)
	}

	// mnemonic
	return (
		<View style={styles.demoBlock}>
			<Text style={[styles.demoHint, { color: colors.textSecondary }]}>
				Стартовая подсказка: образ помогает запомнить ритм. Можно
				мягко «запомнить образ» — основной навык всё равно формируется
				на слух.
			</Text>
			<View style={styles.mnemonicRow}>
				{LEARNING_DEMO_SYMBOL_IDS.mnemonic.map((symbolId) => (
					<View key={symbolId} style={styles.mnemonicCard}>
						<VisualMnemonicCard symbolId={symbolId} />
					</View>
				))}
			</View>
		</View>
	)
}

export function LearningScreen () {
	const { colors } = useTheme()
	const navigation = useNavigation<Nav>()
	const output = getSharedMorseOutputController()

	const [expandedId, setExpandedId] = useState<string | null>(
		LEARNING_TOPICS[0]?.id ?? null,
	)
	const [playing, setPlaying] = useState(false)
	const [playError, setPlayError] = useState<string | null>(null)

	useFocusEffect(
		useCallback(() => {
			return () => {
				void output.stop()
				setPlaying(false)
			}
		}, [output]),
	)

	const handleToggle = (id: string) => {
		setExpandedId((prev) => (prev === id ? null : id))
		if (playing) {
			void output.stop()
			setPlaying(false)
		}
		setPlayError(null)
	}

	const handleStop = async () => {
		await output.stop()
		setPlaying(false)
	}

	const runPlay = async (
		request: Parameters<typeof output.play>[0],
	) => {
		setPlayError(null)
		setPlaying(true)
		const result = await output.play({
			...request,
			onProgress: (info) => {
				setPlaying(info.playing)
			},
		})
		if (!result.ok) {
			setPlayError(result.error)
			setPlaying(false)
		}
	}

	const handlePlayExample = () => {
		const symbol = getSymbolById(LEARNING_DEMO_SYMBOL_IDS.morseExample)
		if (!symbol) {
			setPlayError('Символ для примера не найден.')
			return
		}
		void runPlay({
			mode: 'audio',
			code: symbol.code,
			timing: {
				characterWpm: DEMO_CHAR_WPM,
				farnsworthMultiplier: 1,
				frequencyHz: DEMO_TONE_HZ,
			},
		})
	}

	const handlePlayWpm = (wpm: number) => {
		const symbol = getSymbolById(LEARNING_DEMO_SYMBOL_IDS.wpmLetter)
		if (!symbol) {
			setPlayError('Символ для демо WPM не найден.')
			return
		}
		void runPlay({
			mode: 'audio',
			text: symbol.character,
			alphabet: 'RU',
			timing: {
				characterWpm: wpm,
				farnsworthMultiplier: 1,
				frequencyHz: DEMO_TONE_HZ,
			},
		})
	}

	const handlePlayFarnsworth = (multiplier: number) => {
		void runPlay({
			mode: 'audio',
			text: 'АН',
			alphabet: 'RU',
			timing: {
				characterWpm: DEMO_CHAR_WPM,
				farnsworthMultiplier: multiplier,
				frequencyHz: DEMO_TONE_HZ,
			},
		})
	}

	const handleAction = (route: LearningActionRoute) => {
		if (route === 'demo-only') {
			handlePlayExample()
			return
		}
		if (route === 'first-lesson' || route === 'Lesson') {
			navigation.navigate('Lesson')
			return
		}
		if (!isStackRoute(route)) {
			return
		}
		// Only param-less guide destinations are linked from topics.
		if (
			route === 'Receive' ||
			route === 'Transmit' ||
			route === 'Errors' ||
			route === 'Home' ||
			route === 'Course' ||
			route === 'Reference'
		) {
			navigation.navigate(route)
		}
	}

	return (
		<Screen>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Обучение
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Как устроен тренажёр и с чего начать путь на слух.
			</Text>

			<View style={styles.list}>
				{LEARNING_TOPICS.map((topic) => {
					const expanded = expandedId === topic.id
					return (
						<SurfaceCard key={topic.id} style={styles.card}>
							<Pressable
								accessibilityRole="button"
								accessibilityState={{ expanded }}
								onPress={() => handleToggle(topic.id)}
								style={styles.header}
							>
								<Text
									style={[
										styles.cardTitle,
										{ color: colors.textPrimary },
									]}
								>
									{topic.title}
								</Text>
								<Ionicons
									name={expanded ? 'chevron-up' : 'chevron-down'}
									size={20}
									color={colors.textSecondary}
								/>
							</Pressable>

							{expanded ? (
								<View style={styles.body}>
									{topic.paragraphs.map((paragraph) => (
										<Text
											key={paragraph}
											style={[
												styles.paragraph,
												{ color: colors.textSecondary },
											]}
										>
											{paragraph}
										</Text>
									))}

									<TopicDemo
										topic={topic}
										playing={playing}
										onPlayExample={handlePlayExample}
										onPlayWpm={handlePlayWpm}
										onPlayFarnsworth={handlePlayFarnsworth}
										onStop={() => {
											void handleStop()
										}}
									/>

									{topic.action &&
									topic.action.route !== 'demo-only' ? (
										<AppButton
											label={topic.action.label}
											onPress={() =>
												handleAction(topic.action!.route)
											}
											style={styles.action}
										/>
									) : null}

									{topic.action?.route === 'demo-only' &&
									!topic.demo ? (
										<AppButton
											label={topic.action.label}
											onPress={() =>
												handleAction(topic.action!.route)
											}
											style={styles.action}
										/>
									) : null}
								</View>
							) : null}
						</SurfaceCard>
					)
				})}
			</View>

			{playError ? (
				<Text style={[styles.error, { color: colors.danger }]}>
					{playError}
				</Text>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	title: {
		...typography.display,
		marginBottom: spacing.sm,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.xl,
	},
	list: {
		gap: spacing.md,
	},
	card: {
		paddingVertical: spacing.sm,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
		minHeight: 44,
	},
	cardTitle: {
		...typography.title,
		flex: 1,
	},
	body: {
		marginTop: spacing.md,
		gap: spacing.sm,
	},
	paragraph: {
		...typography.body,
	},
	demoBlock: {
		marginTop: spacing.sm,
		gap: spacing.sm,
	},
	demoHint: {
		...typography.caption,
	},
	demoRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	demoButton: {
		flexGrow: 1,
	},
	demoChip: {
		minWidth: 96,
	},
	stopLink: {
		alignSelf: 'flex-start',
	},
	mnemonicRow: {
		gap: spacing.md,
	},
	mnemonicCard: {
		alignSelf: 'stretch',
	},
	action: {
		alignSelf: 'stretch',
		marginTop: spacing.sm,
	},
	error: {
		...typography.caption,
		marginTop: spacing.lg,
	},
})
