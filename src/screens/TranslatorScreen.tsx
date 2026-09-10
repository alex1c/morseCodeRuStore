/**
 * Translator tool — live text ↔ Morse with audio / vibration / flashlight.
 * Never records training attempts or session history.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useFocusEffect } from '@react-navigation/native'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	RECEIVE_SPACING_OPTIONS,
	RECEIVE_TONE_MAX,
	RECEIVE_TONE_MIN,
	RECEIVE_TONE_STEP,
	RECEIVE_WPM_MAX,
	RECEIVE_WPM_MIN,
	RECEIVE_WPM_STEP,
} from '@/src/features/receive'
import {
	FLASHLIGHT_MAX_WPM,
	getSharedMorseOutputController,
	type MorseOutputMode,
} from '@/src/features/morseOutput'
import {
	buildSymbolBreakdown,
	describeMorsePattern,
	translateMorseToText,
	translateTextToMorse,
	type TranslatorAlphabet,
} from '@/src/features/translator'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import {
	getToolSettings,
	saveToolSettings,
} from '@/src/storage'
import {
	DEFAULT_TOOL_SETTINGS,
	type ToolSettings,
} from '@/src/types'
import { spacing, typography, useTheme } from '@/src/theme'

const BREAKDOWN_MAX_SYMBOLS = 24
const COPY_FEEDBACK_MS = 1600

const OUTPUT_MODES: {
	mode: MorseOutputMode
	label: string
	icon: keyof typeof Ionicons.glyphMap
}[] = [
	{ mode: 'audio', label: 'Звук', icon: 'volume-high' },
	{ mode: 'vibration', label: 'Вибрация', icon: 'phone-portrait' },
	{ mode: 'flashlight', label: 'Фонарик', icon: 'flashlight' },
]

function clamp (value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

function countSymbols (text: string): number {
	return text.replace(/\s+/g, '').length
}

export function TranslatorScreen () {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const output = getSharedMorseOutputController()

	const [settings, setSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS)
	const [input, setInput] = useState('')
	const [playing, setPlaying] = useState(false)
	const [copied, setCopied] = useState(false)
	const [paramsOpen, setParamsOpen] = useState(false)
	const [showBreakdown, setShowBreakdown] = useState(false)
	const [playError, setPlayError] = useState<string | null>(null)
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const persist = useCallback(async (next: ToolSettings) => {
		setSettings(next)
		await saveToolSettings(next)
	}, [])

	useFocusEffect(
		useCallback(() => {
			let active = true
			void (async () => {
				const stored = await getToolSettings()
				if (!active) {
					return
				}
				// Seed alphabet from preferences; BOTH keeps last tool alphabet.
				const alphabet: TranslatorAlphabet =
					preferences.selectedAlphabet === 'LATIN'
						? 'LATIN'
						: preferences.selectedAlphabet === 'RU'
							? 'RU'
							: stored.translatorAlphabet
				setSettings({
					...DEFAULT_TOOL_SETTINGS,
					...stored,
					translatorAlphabet: alphabet,
				})
			})()
			return () => {
				active = false
				void output.stop()
				setPlaying(false)
			}
		}, [output, preferences.selectedAlphabet]),
	)

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current)
			}
			void output.stop()
		}
	}, [output])

	const direction = settings.translatorDirection
	const alphabet = settings.translatorAlphabet

	const translation = useMemo(() => {
		if (direction === 'text-to-morse') {
			return {
				kind: 'text-to-morse' as const,
				...translateTextToMorse(input, alphabet),
			}
		}
		return {
			kind: 'morse-to-text' as const,
			...translateMorseToText(input, alphabet),
		}
	}, [alphabet, direction, input])

	const outputText =
		translation.kind === 'text-to-morse'
			? translation.morse
			: translation.text

	const warningParts: string[] = []
	if (translation.kind === 'text-to-morse' && translation.unsupported.length > 0) {
		warningParts.push(
			`Неподдерживаемые символы: ${translation.unsupported.join(', ')}`,
		)
	}
	if (
		translation.kind === 'morse-to-text' &&
		translation.unknownPatterns.length > 0
	) {
		warningParts.push(
			`Неизвестные коды: ${translation.unknownPatterns.join(', ')}`,
		)
	}

	const playbackSourceText =
		translation.kind === 'text-to-morse'
			? translation.normalizedText
			: translation.text

	const canPlay = playbackSourceText.trim().length > 0
	const canCopy = outputText.trim().length > 0

	const breakdownSource =
		translation.kind === 'text-to-morse'
			? translation.normalizedText
			: translation.text
	const canShowBreakdown =
		breakdownSource.length > 0 &&
		countSymbols(breakdownSource) <= BREAKDOWN_MAX_SYMBOLS
	const breakdown = useMemo(
		() =>
			canShowBreakdown && showBreakdown
				? buildSymbolBreakdown(breakdownSource, alphabet)
				: [],
		[alphabet, breakdownSource, canShowBreakdown, showBreakdown],
	)

	const flashlightCapNote =
		settings.outputMode === 'flashlight' &&
		settings.characterWpm > FLASHLIGHT_MAX_WPM

	const updateSetting = <K extends keyof ToolSettings>(
		key: K,
		value: ToolSettings[K],
	) => {
		void persist({ ...settings, [key]: value })
	}

	const handleCopy = async () => {
		if (!canCopy) {
			return
		}
		await Clipboard.setStringAsync(outputText)
		setCopied(true)
		if (copyTimerRef.current) {
			clearTimeout(copyTimerRef.current)
		}
		copyTimerRef.current = setTimeout(() => {
			setCopied(false)
		}, COPY_FEEDBACK_MS)
	}

	const handleClear = () => {
		setInput('')
		setShowBreakdown(false)
		setPlayError(null)
	}

	const handlePlay = async () => {
		if (!canPlay) {
			return
		}
		setPlayError(null)
		setPlaying(true)
		const result = await output.play({
			mode: settings.outputMode,
			text: playbackSourceText,
			alphabet,
			timing: {
				characterWpm: settings.characterWpm,
				farnsworthMultiplier: settings.farnsworthMultiplier,
				frequencyHz: settings.toneFrequencyHz,
			},
			onProgress: (info) => {
				setPlaying(info.playing)
			},
		})
		if (!result.ok) {
			setPlayError(result.error)
			setPlaying(false)
		}
	}

	const handleStop = async () => {
		await output.stop()
		setPlaying(false)
	}

	const inputAccessibilityLabel =
		direction === 'text-to-morse'
			? 'Ввод текста для перевода в азбуку Морзе'
			: 'Ввод кода Морзе для перевода в текст'

	const outputAccessibilityLabel =
		direction === 'text-to-morse' && outputText
			? `Результат Морзе: ${describeMorsePattern(outputText.replace(/\s+/g, ' '))}`
			: `Результат перевода: ${outputText || 'пусто'}`

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Переводчик
			</Text>

			<View style={styles.row}>
				<AppButton
					label="Текст → Морзе"
					variant={
						direction === 'text-to-morse' ? 'primary' : 'secondary'
					}
					onPress={() => {
						setInput('')
						updateSetting('translatorDirection', 'text-to-morse')
					}}
					style={styles.flex}
					accessibilityLabel="Направление: текст в Морзе"
				/>
				<AppButton
					label="Морзе → Текст"
					variant={
						direction === 'morse-to-text' ? 'primary' : 'secondary'
					}
					onPress={() => {
						setInput('')
						updateSetting('translatorDirection', 'morse-to-text')
					}}
					style={styles.flex}
					accessibilityLabel="Направление: Морзе в текст"
				/>
			</View>

			<View style={styles.row}>
				<AppButton
					label="Русский"
					variant={alphabet === 'RU' ? 'primary' : 'secondary'}
					onPress={() => updateSetting('translatorAlphabet', 'RU')}
					style={styles.flex}
				/>
				<AppButton
					label="Международная"
					variant={alphabet === 'LATIN' ? 'primary' : 'secondary'}
					onPress={() => updateSetting('translatorAlphabet', 'LATIN')}
					style={styles.flex}
					accessibilityLabel="Международная азбука"
				/>
			</View>

			<TextInput
				value={input}
				onChangeText={setInput}
				multiline
				autoCapitalize="characters"
				autoCorrect={false}
				placeholder={
					direction === 'text-to-morse'
						? 'Введите текст…'
						: 'Введите код: · − / …'
				}
				placeholderTextColor={colors.textTertiary}
				accessibilityLabel={inputAccessibilityLabel}
				style={[
					styles.input,
					{
						color: colors.textPrimary,
						backgroundColor: colors.surface,
						borderColor: colors.border,
					},
				]}
			/>

			{direction === 'morse-to-text' ? (
				<Text style={[styles.tip, { color: colors.textSecondary }]}>
					Подсказка: точка «.» / «·», тире «-» / «—», пробел между
					буквами, «/» между словами. Юникод-символы нормализуются
					автоматически.
				</Text>
			) : null}

			<SurfaceCard style={styles.outputCard}>
				<Text
					style={[styles.outputLabel, { color: colors.textTertiary }]}
				>
					Результат
				</Text>
				<Text
					selectable
					accessibilityLabel={outputAccessibilityLabel}
					style={[
						styles.outputText,
						{
							color: outputText
								? colors.textPrimary
								: colors.textTertiary,
						},
					]}
				>
					{outputText || '—'}
				</Text>
			</SurfaceCard>

			{warningParts.length > 0 ? (
				<Text style={[styles.warning, { color: colors.danger }]}>
					{warningParts.join('\n')}
				</Text>
			) : null}

			<View style={styles.row}>
				<AppButton
					label={copied ? 'Скопировано' : 'Копировать'}
					variant="secondary"
					disabled={!canCopy}
					onPress={() => {
						void handleCopy()
					}}
					style={styles.flex}
				/>
				<AppButton
					label="Очистить"
					variant="ghost"
					onPress={handleClear}
					style={styles.flex}
				/>
			</View>

			<View style={styles.modeRow}>
				{OUTPUT_MODES.map((item) => {
					const selected = settings.outputMode === item.mode
					return (
						<Pressable
							key={item.mode}
							accessibilityRole="button"
							accessibilityLabel={item.label}
							accessibilityState={{ selected }}
							onPress={() => updateSetting('outputMode', item.mode)}
							style={[
								styles.modeChip,
								{
									backgroundColor: selected
										? colors.primary
										: colors.surface,
									borderColor: selected
										? colors.primary
										: colors.border,
								},
							]}
						>
							<Ionicons
								name={item.icon}
								size={18}
								color={selected ? '#FFFFFF' : colors.textPrimary}
							/>
							<Text
								style={[
									styles.modeLabel,
									{
										color: selected
											? '#FFFFFF'
											: colors.textPrimary,
									},
								]}
							>
								{item.label}
							</Text>
						</Pressable>
					)
				})}
			</View>

			{flashlightCapNote ? (
				<Text style={[styles.tip, { color: colors.textSecondary }]}>
					Фонарик ограничен {FLASHLIGHT_MAX_WPM} WPM при выбранной
					скорости {settings.characterWpm}.
				</Text>
			) : null}

			{playError ? (
				<Text style={[styles.warning, { color: colors.danger }]}>
					{playError}
				</Text>
			) : null}

			<View style={styles.row}>
				{playing ? (
					<AppButton
						label="Стоп"
						variant="secondary"
						onPress={() => {
							void handleStop()
						}}
						style={styles.flex}
						accessibilityLabel="Остановить воспроизведение"
					/>
				) : (
					<AppButton
						label="Воспроизвести"
						disabled={!canPlay}
						onPress={() => {
							void handlePlay()
						}}
						style={styles.flex}
						accessibilityLabel="Воспроизвести сигнал Морзе"
					/>
				)}
			</View>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Параметры сигнала"
				onPress={() => setParamsOpen((open) => !open)}
				style={styles.paramsToggle}
			>
				<Text style={[styles.paramsTitle, { color: colors.textPrimary }]}>
					Параметры сигнала
				</Text>
				<Ionicons
					name={paramsOpen ? 'chevron-up' : 'chevron-down'}
					size={20}
					color={colors.textSecondary}
				/>
			</Pressable>

			{paramsOpen ? (
				<SurfaceCard style={styles.paramsCard}>
					<View style={styles.paramRow}>
						<Text style={{ color: colors.textSecondary }}>
							WPM: {settings.characterWpm}
						</Text>
						<View style={styles.stepRow}>
							<AppButton
								label="−"
								variant="secondary"
								onPress={() =>
									updateSetting(
										'characterWpm',
										clamp(
											settings.characterWpm - RECEIVE_WPM_STEP,
											RECEIVE_WPM_MIN,
											RECEIVE_WPM_MAX,
										),
									)
								}
								style={styles.stepBtn}
							/>
							<AppButton
								label="+"
								variant="secondary"
								onPress={() =>
									updateSetting(
										'characterWpm',
										clamp(
											settings.characterWpm + RECEIVE_WPM_STEP,
											RECEIVE_WPM_MIN,
											RECEIVE_WPM_MAX,
										),
									)
								}
								style={styles.stepBtn}
							/>
						</View>
					</View>

					<Text style={[styles.paramCaption, { color: colors.textTertiary }]}>
						Интервал (Farnsworth)
					</Text>
					<View style={styles.chipWrap}>
						{RECEIVE_SPACING_OPTIONS.map((value) => {
							const selected =
								settings.farnsworthMultiplier === value
							return (
								<Pressable
									key={value}
									onPress={() =>
										updateSetting('farnsworthMultiplier', value)
									}
									style={[
										styles.spaceChip,
										{
											backgroundColor: selected
												? colors.primary
												: colors.surfaceMuted,
										},
									]}
								>
									<Text
										style={{
											color: selected
												? '#FFFFFF'
												: colors.textPrimary,
										}}
									>
										×{value}
									</Text>
								</Pressable>
							)
						})}
					</View>

					<View style={styles.paramRow}>
						<Text style={{ color: colors.textSecondary }}>
							Тон: {settings.toneFrequencyHz} Гц
						</Text>
						<View style={styles.stepRow}>
							<AppButton
								label="−"
								variant="secondary"
								onPress={() =>
									updateSetting(
										'toneFrequencyHz',
										clamp(
											settings.toneFrequencyHz - RECEIVE_TONE_STEP,
											RECEIVE_TONE_MIN,
											RECEIVE_TONE_MAX,
										),
									)
								}
								style={styles.stepBtn}
							/>
							<AppButton
								label="+"
								variant="secondary"
								onPress={() =>
									updateSetting(
										'toneFrequencyHz',
										clamp(
											settings.toneFrequencyHz + RECEIVE_TONE_STEP,
											RECEIVE_TONE_MIN,
											RECEIVE_TONE_MAX,
										),
									)
								}
								style={styles.stepBtn}
							/>
						</View>
					</View>
				</SurfaceCard>
			) : null}

			{canShowBreakdown ? (
				<>
					<AppButton
						label={
							showBreakdown
								? 'Скрыть разбор'
								: 'Разбор по символам'
						}
						variant="ghost"
						onPress={() => setShowBreakdown((v) => !v)}
					/>
					{showBreakdown ? (
						<SurfaceCard style={styles.breakdownCard}>
							{breakdown.map((row, index) => (
								<View key={`${row.character}-${index}`} style={styles.breakdownRow}>
									<Text
										style={[
											styles.breakdownChar,
											{ color: colors.textPrimary },
										]}
									>
										{row.character}
									</Text>
									<Text
										accessibilityLabel={describeMorsePattern(
											row.pattern,
										)}
										style={[
											styles.breakdownPattern,
											{ color: colors.textSecondary },
										]}
									>
										{row.pattern}
									</Text>
								</View>
							))}
						</SurfaceCard>
					) : null}
				</>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
		gap: spacing.sm,
	},
	title: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flex: {
		flex: 1,
	},
	input: {
		minHeight: 110,
		borderWidth: 1,
		borderRadius: 12,
		padding: spacing.md,
		textAlignVertical: 'top',
		...typography.body,
	},
	tip: {
		...typography.caption,
	},
	outputCard: {
		gap: spacing.xs,
	},
	outputLabel: {
		...typography.label,
	},
	outputText: {
		...typography.subtitle,
	},
	warning: {
		...typography.caption,
	},
	modeRow: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	modeChip: {
		flex: 1,
		minHeight: 44,
		borderWidth: 1,
		borderRadius: 12,
		paddingVertical: spacing.xs,
		paddingHorizontal: spacing.xs,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	modeLabel: {
		...typography.caption,
	},
	paramsToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: spacing.xs,
	},
	paramsTitle: {
		...typography.bodyStrong,
	},
	paramsCard: {
		gap: spacing.sm,
	},
	paramRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: spacing.sm,
	},
	paramCaption: {
		...typography.caption,
	},
	stepRow: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	stepBtn: {
		minWidth: 48,
		paddingHorizontal: spacing.sm,
	},
	chipWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	spaceChip: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: 10,
	},
	breakdownCard: {
		gap: spacing.xs,
	},
	breakdownRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	breakdownChar: {
		...typography.bodyStrong,
	},
	breakdownPattern: {
		...typography.body,
		fontVariant: ['tabular-nums'],
	},
})
