/**
 * Simple SVG accuracy chart for Stats (7/30 day series).
 * Null-accuracy days render as muted gaps — never as 0%.
 */

import { StyleSheet, Text, View } from 'react-native'
import Svg, { Line, Rect } from 'react-native-svg'

import { spacing, typography, useTheme } from '@/src/theme'

export type AccuracyChartPoint = {
	/** Local YYYY-MM-DD */
	dateKey: string
	/** null = no data that day */
	percent: number | null
}

type Props = {
	points: AccuracyChartPoint[]
	height?: number
	/** Screen-reader summary of the series. */
	accessibilitySummary: string
}

export function AccuracyChart ({
	points,
	height = 120,
	accessibilitySummary,
}: Props) {
	const { colors } = useTheme()
	const width = Math.max(280, points.length * 10)
	const padTop = 8
	const padBottom = 4
	const chartH = height - padTop - padBottom
	const barGap = 2
	const barW = Math.max(
		3,
		(width - barGap * Math.max(0, points.length - 1)) / Math.max(points.length, 1),
	)

	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={accessibilitySummary}
			style={styles.wrap}
		>
			<Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
				{/* Baseline */}
				<Line
					x1={0}
					y1={height - padBottom}
					x2={width}
					y2={height - padBottom}
					stroke={colors.border}
					strokeWidth={1}
				/>
				{points.map((point, index) => {
					const x = index * (barW + barGap)
					if (point.percent == null) {
						// Muted tick for empty days (not 0%).
						const tickH = 4
						return (
							<Rect
								key={point.dateKey}
								x={x}
								y={height - padBottom - tickH}
								width={barW}
								height={tickH}
								rx={1}
								fill={colors.border}
								opacity={0.45}
							/>
						)
					}
					const h = Math.max(2, (point.percent / 100) * chartH)
					return (
						<Rect
							key={point.dateKey}
							x={x}
							y={height - padBottom - h}
							width={barW}
							height={h}
							rx={1}
							fill={colors.primary}
						/>
					)
				})}
			</Svg>
			<Text style={[styles.hint, { color: colors.textTertiary }]}>
				Пустые дни — без данных (не 0%)
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: spacing.xs,
	},
	hint: {
		...typography.label,
	},
})
