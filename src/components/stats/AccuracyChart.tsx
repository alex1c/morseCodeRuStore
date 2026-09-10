/**
 * Simple SVG accuracy chart for Stats (7/30 day series).
 * Null-accuracy days render as muted gaps — never as 0%.
 * Day labels under the chart are sparse for longer ranges.
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

/** Weekday short labels for 7-day charts (Mon-first local week). */
const WEEKDAY_SHORT_RU = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/**
 * Pick sparse indices for under-chart day labels.
 * 7-day: all days; 30-day: ~every 5th plus first/last.
 */
export function pickSparseLabelIndices (length: number): number[] {
	if (length <= 0) {
		return []
	}
	if (length <= 7) {
		return Array.from({ length }, (_, i) => i)
	}
	const step = Math.max(5, Math.round(length / 6))
	const indices = new Set<number>([0, length - 1])
	const mid = Math.floor((length - 1) / 2)
	indices.add(mid)
	for (let i = step; i < length - 1; i += step) {
		indices.add(i)
	}
	return [...indices].sort((a, b) => a - b)
}

/** Format YYYY-MM-DD as weekday (7d) or DD.MM (longer ranges). */
function formatDayLabel (dateKey: string, total: number): string {
	if (total <= 7) {
		// Prefer weekday for week view when date parses cleanly.
		const parsed = parseLocalDateKey(dateKey)
		if (parsed != null) {
			// getDay(): 0=Sun … map to Mon-first index.
			const monFirst = (parsed.getDay() + 6) % 7
			return WEEKDAY_SHORT_RU[monFirst] ?? dateKey.slice(8)
		}
		return dateKey.slice(8)
	}
	const parts = dateKey.split('-')
	if (parts.length === 3) {
		return `${parts[2]}.${parts[1]}`
	}
	return dateKey.slice(5)
}

function parseLocalDateKey (dateKey: string): Date | null {
	const parts = dateKey.split('-').map(Number)
	if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
		return null
	}
	const [y, m, d] = parts
	return new Date(y, m - 1, d)
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
	const labelIndices = pickSparseLabelIndices(points.length)
	const labelIndexSet = new Set(labelIndices)

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
			{/* Sparse day labels — avoid crowding on 30-day series. */}
			<View style={styles.labelRow}>
				{points.map((point, index) => {
					if (!labelIndexSet.has(index)) {
						return (
							<View
								key={`pad-${point.dateKey}`}
								style={[styles.labelSlot, { flex: 1 }]}
							/>
						)
					}
					return (
						<Text
							key={`lbl-${point.dateKey}`}
							style={[
								styles.dayLabel,
								styles.labelSlot,
								{ color: colors.textTertiary, flex: 1 },
							]}
							numberOfLines={1}
						>
							{formatDayLabel(point.dateKey, points.length)}
						</Text>
					)
				})}
			</View>
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
	labelRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	labelSlot: {
		minWidth: 0,
	},
	dayLabel: {
		...typography.label,
		textAlign: 'center',
		fontSize: 10,
	},
	hint: {
		...typography.label,
	},
})
