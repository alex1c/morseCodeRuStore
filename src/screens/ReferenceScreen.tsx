import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Screen } from '@/src/components/Screen'
import { VisualMnemonicCard } from '@/src/components/mnemonic/VisualMnemonicCard'
import { AppButton, SurfaceCard } from '@/src/components/ui'
import {
	listLatinLetters,
	listRussianLetters,
	sequenceToPattern,
	type MorseSymbol,
} from '@/src/domain'
import { getMorseAudioService } from '@/src/features/morseAudio'
import { getLearningProgress, getUserPreferences } from '@/src/storage'
import { spacing, typography, useTheme } from '@/src/theme'

export function ReferenceScreen () {
	const { colors } = useTheme()
	const [alphabet, setAlphabet] = useState<'RU' | 'LATIN'>('RU')
	const [known, setKnown] = useState<string[]>([])
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		void (async () => {
			const [prefs, progress] = await Promise.all([
				getUserPreferences(),
				getLearningProgress(),
			])
			setAlphabet(prefs.selectedAlphabet === 'LATIN' ? 'LATIN' : 'RU')
			setKnown(progress.knownSymbolIds)
		})()
		return () => {
			void getMorseAudioService().stop()
		}
	}, [])

	const symbols = useMemo(
		() => (alphabet === 'RU' ? listRussianLetters() : listLatinLetters()),
		[alphabet],
	)
	const selected: MorseSymbol | undefined = symbols.find(
		(symbol) => symbol.id === selectedId,
	) ?? symbols[0]

	return (
		<Screen contentStyle={styles.content}>
			<Text style={[styles.title, { color: colors.textPrimary }]}>
				Визуальная азбука
			</Text>
			<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
				Слушайте и просматривайте символы. Неразблокированные отмечены отдельно.
			</Text>
			<View style={styles.row}>
				<AppButton
					label="Русский"
					variant={alphabet === 'RU' ? 'primary' : 'secondary'}
					onPress={() => setAlphabet('RU')}
					style={styles.flex}
				/>
				<AppButton
					label="Latin"
					variant={alphabet === 'LATIN' ? 'primary' : 'secondary'}
					onPress={() => setAlphabet('LATIN')}
					style={styles.flex}
				/>
			</View>
			<View style={styles.grid}>
				{symbols.map((symbol) => {
					const isKnown = known.includes(symbol.id)
					return (
						<Pressable
							key={symbol.id}
							onPress={() => setSelectedId(symbol.id)}
							style={[
								styles.cell,
								{
									backgroundColor: isKnown
										? colors.surface
										: colors.surfaceMuted,
									borderColor:
										selected?.id === symbol.id
											? colors.primary
											: colors.border,
								},
							]}
						>
							<Text style={[styles.cellChar, { color: colors.textPrimary }]}>
								{symbol.character}
							</Text>
							<Text style={[styles.cellMeta, { color: colors.textTertiary }]}>
								{isKnown ? 'изучен' : 'доступен позже'}
							</Text>
						</Pressable>
					)
				})}
			</View>

			{selected ? (
				<SurfaceCard style={styles.detail}>
					<Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
						{selected.character} · {sequenceToPattern(selected.code)}
					</Text>
					<VisualMnemonicCard symbolId={selected.id} />
					<AppButton
						label={busy ? 'Играет…' : 'Прослушать символ'}
						disabled={busy}
						onPress={async () => {
							setBusy(true)
							try {
								await getMorseAudioService().playCode(selected.code, {
									characterWpm: 15,
									farnsworthMultiplier: 1.5,
									frequencyHz: 600,
								})
							} finally {
								setBusy(false)
							}
						}}
						accessibilityLabel="Прослушать символ в визуальной азбуке"
					/>
				</SurfaceCard>
			) : null}
		</Screen>
	)
}

const styles = StyleSheet.create({
	content: {
		paddingBottom: spacing.xxl,
	},
	title: {
		...typography.title,
		marginBottom: spacing.xs,
	},
	subtitle: {
		...typography.body,
		marginBottom: spacing.sm,
	},
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
	},
	flex: {
		flex: 1,
	},
	grid: {
		marginTop: spacing.md,
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
	},
	cell: {
		width: '23%',
		minHeight: 72,
		borderWidth: 1,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cellChar: {
		...typography.bodyStrong,
	},
	cellMeta: {
		fontSize: 10,
		lineHeight: 14,
	},
	detail: {
		marginTop: spacing.md,
		gap: spacing.sm,
	},
	detailTitle: {
		...typography.subtitle,
	},
})
