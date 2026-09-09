/**
 * Temporary Morse Engine lab (Phase 2).
 * Replaces the Phase 1 Reference placeholder until the real Phase 9 handbook.
 */

import { useEffect, useMemo, useState } from 'react'
import {
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native'

import { Screen } from '@/src/components/Screen'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	createTimingModel,
	encodeTextToPatternString,
	listLatinLetters,
	listRussianLetters,
	sequenceToPattern,
	type AlphabetContext,
	type MorseSymbol,
} from '@/src/domain/morse'
import { getMorseAudioService } from '@/src/features/morseAudio'
import { spacing, typography, useTheme } from '@/src/theme'

const WPM_OPTIONS = [10, 12, 15, 20] as const
const FARNSWORTH_OPTIONS = [1, 1.5, 2, 3] as const

export function ReferenceScreen () {
	const { colors } = useTheme()
	const [alphabet, setAlphabet] = useState<Exclude<AlphabetContext, 'BOTH'>>(
		'RU',
	)
	const [wpm, setWpm] = useState<(typeof WPM_OPTIONS)[number]>(15)
	const [farnsworth, setFarnsworth] =
		useState<(typeof FARNSWORTH_OPTIONS)[number]>(1.5)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const symbols = useMemo(
		() =>
			(alphabet === 'RU' ? listRussianLetters() : listLatinLetters()).filter(
				(symbol) => !symbol.decodeAliasOfId,
			),
		[alphabet],
	)

	const selected: MorseSymbol | undefined = symbols.find(
		(symbol) => symbol.id === selectedId,
	) ?? symbols[0]

	const timing = createTimingModel({
		characterWpm: wpm,
		farnsworthMultiplier: farnsworth,
	})

	useEffect(() => {
		return () => {
			void getMorseAudioService().stop()
		}
	}, [])

	const handlePlaySymbol = async () => {
		if (!selected || busy) {
			return
		}
		setBusy(true)
		try {
			await getMorseAudioService().playCode(selected.code, {
				frequencyHz: 600,
				characterWpm: wpm,
				farnsworthMultiplier: farnsworth,
			})
		} finally {
			setBusy(false)
		}
	}

	const sampleWord = alphabet === 'RU' ? 'ПРИВЕТ' : 'SOS'
	const samplePattern = encodeTextToPatternString(sampleWord, alphabet)

	const handlePlaySample = async () => {
		if (busy) {
			return
		}
		setBusy(true)
		try {
			await getMorseAudioService().playText(sampleWord, {
				alphabet,
				frequencyHz: 600,
				characterWpm: wpm,
				farnsworthMultiplier: farnsworth,
			})
		} finally {
			setBusy(false)
		}
	}

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.kicker, { color: colors.accent }]}>
				Движок Морзе · временная лаборатория
			</Text>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Проверка каталога и тайминга
			</Text>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Алфавит
			</Text>
			<View style={styles.row}>
				{(['RU', 'LATIN'] as const).map((value) => (
					<AppButton
						key={value}
						label={value === 'RU' ? 'Русский' : 'Latin'}
						variant={alphabet === value ? 'primary' : 'secondary'}
						onPress={() => {
							setAlphabet(value)
							setSelectedId(null)
						}}
						style={styles.flexBtn}
					/>
				))}
			</View>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				WPM
			</Text>
			<View style={styles.row}>
				{WPM_OPTIONS.map((value) => (
					<AppButton
						key={value}
						label={String(value)}
						variant={wpm === value ? 'primary' : 'secondary'}
						onPress={() => setWpm(value)}
						style={styles.flexBtn}
					/>
				))}
			</View>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Farnsworth ×
			</Text>
			<View style={styles.row}>
				{FARNSWORTH_OPTIONS.map((value) => (
					<AppButton
						key={value}
						label={String(value)}
						variant={farnsworth === value ? 'primary' : 'secondary'}
						onPress={() => setFarnsworth(value)}
						style={styles.flexBtn}
					/>
				))}
			</View>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					unit {timing.unitMs.toFixed(1)} ms · dot {timing.dotMs} · dash{' '}
					{timing.dashMs} · letter {timing.letterGapMs} · word{' '}
					{timing.wordGapMs}
				</Text>
				<Text style={[styles.symbolChar, { color: colors.textPrimary }]}>
					{selected?.character ?? '—'}
				</Text>
				<Text style={[styles.pattern, { color: colors.primary }]}>
					{selected ? sequenceToPattern(selected.code) : ''}
				</Text>
				<AppButton
					label={busy ? 'Играет…' : 'Слушать символ'}
					onPress={() => {
						void handlePlaySymbol()
					}}
					disabled={busy || !selected}
				/>
				<AppButton
					label={`Стоп`}
					variant="secondary"
					onPress={() => {
						void getMorseAudioService().stop()
						setBusy(false)
					}}
					style={styles.stopBtn}
				/>
			</SurfaceCard>

			<Text style={[styles.label, { color: colors.textSecondary }]}>
				Символы
			</Text>
			<View style={styles.chips}>
				{symbols.map((symbol) => {
					const active = symbol.id === selected?.id
					return (
						<Pressable
							key={symbol.id}
							onPress={() => setSelectedId(symbol.id)}
							style={[
								styles.chip,
								{
									backgroundColor: active
										? colors.primaryMuted
										: colors.surface,
									borderColor: active
										? colors.primary
										: colors.border,
								},
							]}
						>
							<Text
								style={{
									color: colors.textPrimary,
									...typography.bodyStrong,
								}}
							>
								{symbol.character}
							</Text>
						</Pressable>
					)
				})}
			</View>

			<SurfaceCard style={styles.card}>
				<Text style={[styles.meta, { color: colors.textSecondary }]}>
					Пример: {sampleWord}
				</Text>
				<Text style={[styles.pattern, { color: colors.textPrimary }]}>
					{samplePattern}
				</Text>
				<AppButton
					label={busy ? 'Играет…' : 'Слушать пример'}
					onPress={() => {
						void handlePlaySample()
					}}
					disabled={busy}
				/>
			</SurfaceCard>
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
	},
	kicker: {
		...typography.label,
		marginBottom: spacing.xs,
	},
	title: {
		...typography.title,
		marginBottom: spacing.lg,
	},
	label: {
		...typography.label,
		marginBottom: spacing.xs,
		marginTop: spacing.sm,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.xs,
		marginBottom: spacing.sm,
	},
	flexBtn: {
		flex: 1,
		paddingHorizontal: spacing.sm,
	},
	card: {
		marginTop: spacing.md,
		gap: spacing.sm,
	},
	meta: {
		...typography.caption,
	},
	symbolChar: {
		fontSize: 40,
		lineHeight: 48,
		fontWeight: '700',
	},
	pattern: {
		...typography.subtitle,
		fontVariant: ['tabular-nums'],
		marginBottom: spacing.xs,
	},
	stopBtn: {
		marginTop: spacing.xs,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	chip: {
		minWidth: 44,
		minHeight: 44,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.sm,
	},
})
