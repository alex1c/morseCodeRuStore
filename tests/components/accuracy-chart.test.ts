/**
 * AccuracyChart sparse label indices for 7/30-day series.
 */

import { pickSparseLabelIndices } from '@/src/components/stats/AccuracyChart'

describe('AccuracyChart pickSparseLabelIndices', () => {
	test('7-day series labels every day', () => {
		expect(pickSparseLabelIndices(7)).toEqual([0, 1, 2, 3, 4, 5, 6])
	})

	test('30-day series is sparse and includes ends', () => {
		const indices = pickSparseLabelIndices(30)
		expect(indices[0]).toBe(0)
		expect(indices[indices.length - 1]).toBe(29)
		// Far fewer than one label per day.
		expect(indices.length).toBeLessThan(12)
		expect(indices.length).toBeGreaterThan(3)
		// Sorted unique.
		expect(indices).toEqual([...new Set(indices)].sort((a, b) => a - b))
	})

	test('empty series', () => {
		expect(pickSparseLabelIndices(0)).toEqual([])
	})
})
