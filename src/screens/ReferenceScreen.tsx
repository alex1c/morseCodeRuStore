/**
 * Reference tool — searchable Morse catalog with playback and mnemonics.
 * Does not update training stats or session history.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'

import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/src/analytics'
import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import { sequenceToPattern, type MorseSymbol } from '@/src/domain'
import { AdBanner } from '@/src/features/ads'
import { useAppBootstrap } from '@/src/features/bootstrap/AppBootstrap'
import {
	FLASHLIGHT_MAX_WPM,
	getSharedMorseOutputController,
	type MorseOutputMode,
} from '@/src/features/morseOutput'
import {
	filterReferenceSymbols,
	findEquivalentLetter,
	listReferenceSymbols,
	type ReferenceSection,
} from '@/src/features/reference'
import {
	getLearningProgress,
	getToolSettings,
	saveToolSettings,
} from '@/src/storage'
import {
	DEFAULT_TOOL_SETTINGS,
	type ToolSettings,
} from '@/src/types'
import { getVisualMnemonicBySymbolId } from '@/src/domain/visual-mnemonic'
import { spacing, typography, useTheme } from '@/src/theme'

const SECTION_TABS: { id: ReferenceSection; label: string }[] = [
	{ id: 'RU', label: 'Русский' },
	{ id: 'LATIN', label: 'Международная' },
	{ id: 'digits', label: 'Цифры' },
	{ id: 'punctuation', label: 'Знаки' },
]

const OUTPUT_MODES: {
	mode: MorseOutputMode
	label: string
	icon: keyof typeof Ionicons.glyphMap
}[] = [
	{ mode: 'audio', label: 'Звук', icon: 'volume-high' },
	{ mode: 'vibration', label: 'Вибрация', icon: 'phone-portrait' },
	{ mode: 'flashlight', label: 'Фонарик', icon: 'flashlight' },
]

function sectionFromPreferences (
	selected: 'RU' | 'LATIN' | 'BOTH',
	storedAlphabet: 'RU' | 'LATIN',
): ReferenceSection {
	if (selected === 'LATIN') {
		return 'LATIN'
	}
	if (selected === 'RU') {
		return 'RU'
	}
	return storedAlphabet
}

function isLetterSection (section: ReferenceSection): boolean {
	return section === 'RU' || section === 'LATIN'
}

export function ReferenceScreen () {
	const { colors } = useTheme()
	const { preferences } = useAppBootstrap()
	const output = getSharedMorseOutputController()

	const [section, setSection] = useState<ReferenceSection>('RU')
	const [query, setQuery] = useState('')
	const [known, setKnown] = useState<string[]>([])
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [settings, setSettings] = useState<ToolSettings>(DEFAULT_TOOL_SETTINGS)
	const [playing, setPlaying] = useState(false)
	const [playError, setPlayError] = useState<string | null>(null)

	const persistTools = useCallback(async (next: ToolSettings) => {
		setSettings(next)
		await saveToolSettings(next)
	}, [])

	useFocusEffect(
		useCallback(() => {
			let active = true
			trackAnalyticsEvent(ANALYTICS_EVENTS.REFERENCE_OPENED)
			void (async () => {
				const [tools, progress] = await Promise.all([
					getToolSettings(),
					getLearningProgress(),
				])
				if (!active) {
					return
				}
				const nextTools = {
					...DEFAULT_TOOL_SETTINGS,
					...tools,
				}
				setSettings(nextTools)
				setKnown(progress.knownSymbolIds)
				setSection(
					sectionFromPreferences(
						preferences.selectedAlphabet,
						nextTools.translatorAlphabet,
					),
				)
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
			void output.stop()
		}
	}, [output])

	const allSymbols = useMemo(
		() => listReferenceSymbols(section),
		[section],
	)
	const symbols = useMemo(
		() => filterReferenceSymbols(allSymbols, query),
		[allSymbols, query],
	)

	const selected: MorseSymbol | undefined =
		symbols.find((symbol) => symbol.id === selectedId) ??
		symbols[0]

	const equivalent = selected ? findEquivalentLetter(selected) : null
	const hasMnemonic = selected
		? Boolean(getVisualMnemonicBySymbolId(selected.id))
		: false

	const flashlightCapNote =
		settings.outputMode === 'flashlight' &&
		settings.characterWpm > FLASHLIGHT_MAX_WPM

	const isAvailable = (symbol: MorseSymbol): boolean => {
		if (!isLetterSection(section)) {
			return true
		}
		return known.includes(symbol.id)
	}

	const handleSection = (next: ReferenceSection) => {
		setSection(next)
		setSelectedId(null)
		setQuery('')
		setPlayError(null)
		if (next === 'RU' || next === 'LATIN') {
			void persistTools({
				...settings,
				translatorAlphabet: next,
			})
		}
	}

	const handlePlaySymbol = async (symbol: MorseSymbol) => {
		setPlayError(null)
		setPlaying(true)
		// Mode enum only — never send the symbol character/code.
		trackAnalyticsEvent(ANALYTICS_EVENTS.OUTPUT_MODE_USED, {
			output_mode: settings.outputMode,
		})
		const result = await output.play({
			mode: settings.outputMode,
			code: symbol.code,
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

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Справочник
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Слушайте, смотрите мнемоники и ищите символы. Статистика обучения
				не меняется.
			</Text>

			<View style={styles.sectionWrap}>
				{SECTION_TABS.map((tab) => {
					const selectedTab = section === tab.id
					return (
						<Pressable
							key={tab.id}
							accessibilityRole="button"
							accessibilityState={{ selected: selectedTab }}
							onPress={() => handleSection(tab.id)}
							style={[
								styles.sectionChip,
								{
									backgroundColor: selectedTab
										? colors.primary
										: colors.surface,
									borderColor: selectedTab
										? colors.primary
										: colors.border,
								},
							]}
						>
							<Text
								style={{
									color: selectedTab
										? '#FFFFFF'
										: colors.textPrimary,
									...typography.caption,
								}}
							>
								{tab.label}
							</Text>
						</Pressable>
					)
				})}
			</View>

			<TextInput
				value={query}
				onChangeText={setQuery}
				placeholder="Найти символ"
				placeholderTextColor={colors.textTertiary}
				autoCorrect={false}
				accessibilityLabel="Найти символ"
				style={[
					styles.search,
					{
						color: colors.textPrimary,
						backgroundColor: colors.surface,
						borderColor: colors.border,
					},
				]}
			/>

			{symbols.length === 0 ? (
				<SurfaceCard style={styles.emptyCard}>
					<Text style={{ color: colors.textSecondary }}>
						Ничего не найдено
					</Text>
					<AppButton
						label="Очистить поиск"
						variant="secondary"
						onPress={() => setQuery('')}
					/>
				</SurfaceCard>
			) : (
				<View style={styles.grid}>
					{symbols.map((symbol) => {
						const available = isAvailable(symbol)
						const isSelected = selected?.id === symbol.id
						const pattern = sequenceToPattern(symbol.code)
						return (
							<View
								key={symbol.id}
								style={[
									styles.cell,
									{
										backgroundColor: available
											? colors.surface
											: colors.surfaceMuted,
										borderColor: isSelected
											? colors.primary
											: colors.border,
									},
								]}
							>
								<Pressable
									onPress={() => setSelectedId(symbol.id)}
									accessibilityRole="button"
									accessibilityLabel={`${symbol.character}, ${pattern}`}
									style={styles.cellBody}
								>
									<Text
										style={[
											styles.cellChar,
											{ color: colors.textPrimary },
										]}
									>
										{symbol.character}
									</Text>
									<Text
										style={[
											styles.cellMeta,
											{ color: colors.textTertiary },
										]}
									>
										{pattern}
									</Text>
									{isLetterSection(section) ? (
										<Text
											style={[
												styles.cellMeta,
												{ color: colors.textSecondary },
											]}
										>
											{available ? 'изучен' : 'позже'}
										</Text>
									) : null}
								</Pressable>
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={`Воспроизвести ${symbol.character}`}
									onPress={() => {
										void handlePlaySymbol(symbol)
									}}
									style={styles.playMini}
								>
									<Ionicons
										name="play"
										size={16}
										color={colors.primary}
									/>
								</Pressable>
							</View>
						)
					})}
				</View>
			)}

			<View style={styles.modeRow}>
				{OUTPUT_MODES.map((item) => {
					const selectedMode = settings.outputMode === item.mode
					return (
						<Pressable
							key={item.mode}
							accessibilityRole="button"
							accessibilityLabel={item.label}
							accessibilityState={{ selected: selectedMode }}
							onPress={() =>
								void persistTools({
									...settings,
									outputMode: item.mode,
								})
							}
							style={[
								styles.modeChip,
								{
									backgroundColor: selectedMode
										? colors.primary
										: colors.surface,
									borderColor: selectedMode
										? colors.primary
										: colors.border,
								},
							]}
						>
							<Ionicons
								name={item.icon}
								size={16}
								color={
									selectedMode ? '#FFFFFF' : colors.textPrimary
								}
							/>
							<Text
								style={{
									color: selectedMode
										? '#FFFFFF'
										: colors.textPrimary,
									...typography.caption,
								}}
							>
								{item.label}
							</Text>
						</Pressable>
					)
				})}
			</View>

			{flashlightCapNote ? (
				<Text style={[styles.hint, { color: colors.textSecondary }]}>
					Фонарик ограничен {FLASHLIGHT_MAX_WPM} WPM.
				</Text>
			) : null}

			{playError ? (
				<Text style={[styles.hint, { color: colors.danger }]}>
					{playError}
				</Text>
			) : null}

			{playing ? (
				<AppButton
					label="Стоп"
					variant="secondary"
					onPress={() => {
						void handleStop()
					}}
				/>
			) : null}

			{selected ? (
				<SurfaceCard style={styles.detail}>
					<Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
						{selected.character} · {sequenceToPattern(selected.code)}
					</Text>
					{isLetterSection(section) && !isAvailable(selected) ? (
						<Text style={{ color: colors.textSecondary }}>
							Символ ещё не изучен в курсе — воспроизведение
							доступно, прогресс не меняется.
						</Text>
					) : null}
					{hasMnemonic || isLetterSection(section) ? (
						<VisualMnemonicCard symbolId={selected.id} />
					) : null}
					{/* Ё shares the same Morse signal as Е — say so explicitly. */}
					{selected.id === 'ru-yo' ? (
						<Text style={{ color: colors.textSecondary }}>
							В Морзе используется тот же сигнал, что у Е.
						</Text>
					) : null}
					{/* Ъ often falls back to the basic card; note shared-pattern context. */}
					{selected.id === 'ru-hard' ? (
						<Text style={{ color: colors.textSecondary }}>
							Отдельный образ может отсутствовать — смотрите код
							и эквивалент, если есть.
						</Text>
					) : null}
					{equivalent ? (
						<Text style={{ color: colors.textSecondary }}>
							Эквивалент:{' '}
							{equivalent.family === 'RU' ? 'рус.' : 'лат.'}{' '}
							{equivalent.character} (
							{sequenceToPattern(equivalent.code)})
						</Text>
					) : null}
					<AppButton
						label={playing ? 'Играет…' : 'Воспроизвести символ'}
						disabled={playing}
						onPress={() => {
							void handlePlaySymbol(selected)
						}}
						accessibilityLabel="Воспроизвести выбранный символ"
					/>
				</SurfaceCard>
			) : null}

			<AdBanner placement="reference" />
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
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.xs,
	},
	sectionWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	sectionChip: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
	},
	search: {
		minHeight: 44,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: spacing.md,
		...typography.body,
	},
	emptyCard: {
		gap: spacing.sm,
		alignItems: 'flex-start',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.sm,
	},
	cell: {
		width: '30%',
		minHeight: 88,
		borderWidth: 1,
		borderRadius: 12,
		overflow: 'hidden',
	},
	cellBody: {
		padding: spacing.sm,
		paddingBottom: 4,
		justifyContent: 'center',
	},
	cellChar: {
		...typography.subtitle,
	},
	cellMeta: {
		...typography.caption,
	},
	playMini: {
		alignSelf: 'flex-end',
		paddingHorizontal: spacing.sm,
		paddingBottom: spacing.sm,
	},
	modeRow: {
		flexDirection: 'row',
		gap: spacing.xs,
	},
	modeChip: {
		flex: 1,
		minHeight: 40,
		borderWidth: 1,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		paddingVertical: spacing.xs,
	},
	hint: {
		...typography.caption,
	},
	detail: {
		gap: spacing.sm,
	},
	detailTitle: {
		...typography.subtitle,
	},
})
