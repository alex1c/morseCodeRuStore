/**
 * Transmit key classification tests.
 */

import {
	classifyKeyPress,
	createClassificationModel,
	unitMsFromWpm,
} from '@/src/domain'

describe('transmit classification', () => {
	test('thresholds scale with WPM', () => {
		const at10 = createClassificationModel(10)
		const at20 = createClassificationModel(20)
		expect(at10.unitMs).toBe(unitMsFromWpm(10))
		expect(at20.unitMs).toBe(unitMsFromWpm(20))
		expect(at10.thresholdMs).toBe(2 * at10.unitMs)
		expect(at20.thresholdMs).toBeLessThan(at10.thresholdMs)
	})

	test('classifies dots and dashes at 12 WPM', () => {
		const model = createClassificationModel(12)
		const dot = classifyKeyPress(model.dotMs, 12)
		const dash = classifyKeyPress(model.dashMs, 12)
		expect(dot.element).toBe('dot')
		expect(dash.element).toBe('dash')
		expect(dot.ignored).toBe(false)
	})

	test('boundary near threshold', () => {
		const model = createClassificationModel(12)
		const justDot = classifyKeyPress(model.thresholdMs - 1, 12)
		const justDash = classifyKeyPress(model.thresholdMs, 12)
		expect(justDot.element).toBe('dot')
		expect(justDash.element).toBe('dash')
	})

	test('ignores accidental short taps', () => {
		const ignored = classifyKeyPress(10, 12)
		expect(ignored.ignored).toBe(true)
		expect(ignored.element).toBeNull()
	})

	test('long hold is still dash with tooLong quality', () => {
		const model = createClassificationModel(12)
		const long = classifyKeyPress(model.dashMs * 4, 12)
		expect(long.element).toBe('dash')
		expect(long.quality).toBe('tooLong')
	})

	test('ideal durations get good quality', () => {
		const model = createClassificationModel(15)
		expect(classifyKeyPress(model.dotMs, 15).quality).toBe('good')
		expect(classifyKeyPress(model.dashMs, 15).quality).toBe('good')
	})
})
