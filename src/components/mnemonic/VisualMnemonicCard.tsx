import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

import { getSymbolById, sequenceToPattern } from '@/src/domain/morse'
import { getVisualMnemonicBySymbolId } from '@/src/domain/visual-mnemonic'
import { describeMorsePattern } from '@/src/features/translator'
import { spacing, typography, useTheme } from '@/src/theme'

type VisualMnemonicCardProps = {
	symbolId: string
	activeElementIndex?: number
	showPattern?: boolean
}

export function VisualMnemonicCard ({
	symbolId,
	activeElementIndex = -1,
	showPattern = true,
}: VisualMnemonicCardProps) {
	const { colors } = useTheme()
	const symbol = getSymbolById(symbolId)
	if (!symbol) {
		return null
	}

	const pattern = sequenceToPattern(symbol.code)
	// Speak Morse as «точка тире» instead of reading "." / "-" literally.
	const patternSpoken = describeMorsePattern(pattern)
	const accessibilityLabel =
		`Символ ${symbol.character}, код Морзе: ${patternSpoken}`

	const mnemonic = getVisualMnemonicBySymbolId(symbolId)
	if (!mnemonic) {
		return (
			<View
				accessible={true}
				accessibilityLabel={accessibilityLabel}
				style={[
					styles.fallback,
					{
						backgroundColor: colors.surfaceMuted,
						borderColor: colors.border,
					},
				]}
			>
				<Text style={[styles.letter, { color: colors.textPrimary }]}>
					{symbol.character}
				</Text>
				<Text style={[styles.pattern, { color: colors.textSecondary }]}>
					{pattern}
				</Text>
				{/* Honest fallback — no mnemonic art for this symbol yet. */}
				<Text style={[styles.caption, { color: colors.textTertiary }]}>
					Базовая карточка (мнемоника в разработке)
				</Text>
			</View>
		)
	}

	return (
		<View
			accessible={true}
			accessibilityLabel={accessibilityLabel}
			style={[
				styles.wrap,
				{
					backgroundColor: colors.surfaceMuted,
					borderColor: colors.border,
				},
			]}
		>
			<Svg width="100%" height={mnemonic.height} viewBox={`0 0 ${mnemonic.width} ${mnemonic.height}`}>
				<Path
					d={mnemonic.guidePath}
					stroke={colors.textSecondary}
					strokeWidth={5}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
					opacity={0.35}
				/>
				{mnemonic.elements.map((element, index) => {
					const active = index === activeElementIndex
					if (element.type === 'dot') {
						return (
							<Circle
								key={`${index}-dot`}
								cx={element.x}
								cy={element.y}
								r={active ? 11 : 9}
								fill={active ? colors.accent : colors.primary}
							/>
						)
					}
					return (
						<Rect
							key={`${index}-dash`}
							x={element.x}
							y={element.y - 8}
							width={element.width}
							height={16}
							rx={8}
							fill={active ? colors.accent : colors.primary}
						/>
					)
				})}
			</Svg>
			<Text style={[styles.label, { color: colors.textPrimary }]}>
				{symbol.character}
			</Text>
			{showPattern ? (
				<Text style={[styles.pattern, { color: colors.textSecondary }]}>
					{pattern}
				</Text>
			) : null}
			{/* Soft invitation — does not claim the image guarantees memory. */}
			<Text style={[styles.caption, { color: colors.textTertiary }]}>
				Запомнить образ
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		borderWidth: 1,
		borderRadius: 14,
		padding: spacing.md,
		gap: spacing.xs,
	},
	fallback: {
		borderWidth: 1,
		borderRadius: 14,
		padding: spacing.lg,
		alignItems: 'center',
		gap: spacing.xs,
	},
	letter: {
		fontSize: 42,
		lineHeight: 48,
		fontWeight: '700',
		textAlign: 'center',
	},
	label: {
		fontSize: 34,
		lineHeight: 40,
		fontWeight: '700',
		textAlign: 'center',
	},
	pattern: {
		...typography.subtitle,
		textAlign: 'center',
	},
	caption: {
		...typography.caption,
		textAlign: 'center',
	},
})
