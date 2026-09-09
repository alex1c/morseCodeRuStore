/**
 * Transmit evaluation + timing quality.
 */

import { evaluateTransmitSequence } from '@/src/domain'

describe('transmit evaluation', () => {
	test('exact match', () => {
		const result = evaluateTransmitSequence(
			['dot', 'dash'],
			[
				{ element: 'dot', durationMs: 100, quality: 'good' },
				{ element: 'dash', durationMs: 300, quality: 'good' },
			],
		)
		expect(result.exactMatch).toBe(true)
		expect(result.mismatches).toHaveLength(0)
		expect(result.timingSummary).toBe('good')
	})

	test('mismatch / missing / extra', () => {
		const mismatch = evaluateTransmitSequence(
			['dot', 'dash'],
			[
				{ element: 'dash', durationMs: 300, quality: 'good' },
				{ element: 'dot', durationMs: 100, quality: 'good' },
			],
		)
		expect(mismatch.exactMatch).toBe(false)
		expect(mismatch.mismatches.length).toBeGreaterThan(0)

		const missing = evaluateTransmitSequence(
			['dot', 'dash'],
			[{ element: 'dot', durationMs: 100, quality: 'good' }],
		)
		expect(missing.missingCount).toBe(1)

		const extra = evaluateTransmitSequence(
			['dot'],
			[
				{ element: 'dot', durationMs: 100, quality: 'good' },
				{ element: 'dash', durationMs: 300, quality: 'acceptable' },
			],
		)
		expect(extra.extraCount).toBe(1)
		expect(extra.exactMatch).toBe(false)
	})

	test('timing quality does not fail exact code', () => {
		const result = evaluateTransmitSequence(
			['dot'],
			[{ element: 'dot', durationMs: 50, quality: 'tooShort' }],
		)
		expect(result.exactMatch).toBe(true)
		expect(result.timingSummary).toBe('needsPractice')
	})

	test('repeated elements compare correctly', () => {
		const result = evaluateTransmitSequence(
			['dot', 'dot', 'dot'],
			[
				{ element: 'dot', durationMs: 80, quality: 'good' },
				{ element: 'dot', durationMs: 80, quality: 'good' },
				{ element: 'dash', durationMs: 240, quality: 'good' },
			],
		)
		expect(result.exactMatch).toBe(false)
		expect(result.mismatches[0]?.index).toBe(2)
	})
})
